import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { KeyedMutex } from "../../application/KeyedMutex";

import type { Session, TokenService } from "../../application/ports/Auth";

import { GameError } from "../../domain/game";
import { RoomError, normalizeCode, type Room } from "../../domain/room";
import { KeyedTimers } from "../../infrastructure/KeyedTimers";
import { RateLimiter } from "../../infrastructure/RateLimiter";
import { readToken } from "../sessionCookie";
import { viewFor } from "./presenter";
import {
  acceptDraw4Action,
  catchAction,
  challengeDraw4Action,
  drawAction,
  GameDeps,
  getSeatedRoom,
  passAction,
  playCardAction,
  unoAction,
} from "../../application/gameUsecases";
import {
  catchSchema,
  emoteSchema,
  emptySchema,
  joinSchema,
  playSchema,
} from "./schema";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
} from "../../application/roomUseCase";

const TURN_MS = 45_000;
const EMPTY_ROOM_MS = 10 * 60_000;
const DISCONNECT_GRACE_MS = 5_000;

export type SocketContext = {
  deps: GameDeps;
  tokens: TokenService;
  clientUrl: string;
};

type Ack = (
  response: { ok: true; code?: string } | { ok: false; error: string },
) => void;

const playerChannel = (playerId: string) => `player:${playerId}`;

function friendlyError(err: unknown): string {
  if (err instanceof GameError || err instanceof RoomError) return err.message;
  console.error("socket handler failed", err);
  return "Something went wrong";
}

export function attachSocketServer(
  httpServer: HttpServer,
  ctx: SocketContext,
): Server {
  const io = new Server(httpServer, {
    cors: { origin: ctx.clientUrl, credentials: true },
    maxHttpBufferSize: 10_000,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, !origin || origin === ctx.clientUrl);
    },
  });

  const lock = new KeyedMutex();
  const turnTimers = new KeyedTimers();
  const cleanupTimers = new KeyedTimers();
  const disconnectTimers = new KeyedTimers();

  const deadlines = new Map<string, number>(); // room code to turn deadline
  const turnKeys = new Map<string, string>(); // room code to a fingerprint of the current turn
  const playerRooms = new Map<string, string>(); // player id to room code

  const limiter = new RateLimiter(30, 10_000);
  const emoteLimiter = new RateLimiter(5, 5_000);
  const joinLimiter = new RateLimiter(10, 60_000);
  const createLimiter = new RateLimiter(5, 60_000);
  for (const l of [limiter, emoteLimiter, joinLimiter, createLimiter]) {
    setInterval(() => l.sweep(), 60_000).unref();
  }

  // ---------- Helpers shared by all connections ----------

  function broadcast(room: Room): void {
    const deadline = deadlines.get(room.code) ?? null;
    for (const seat of room.seats) {
      io.to(playerChannel(seat.playerId)).emit(
        "room:state",
        viewFor(room, seat.playerId, deadline),
      );
    }
  }

  // Keeps the turn timer and the abandoned room timer in step with the room
  function afterChange(room: Room | null, code: string): void {
    if (!room) {
      turnTimers.clear(code);
      cleanupTimers.clear(code);
      deadlines.delete(code);
      turnKeys.delete(code);
      return;
    }

    const game = room.game;
    if (room.status === "playing" && game) {
      // The timer only restarts when the turn really changed, so reconnecting cannot buy extra time
      const key = `${game.current}|${game.drawnCardId}|${game.pendingDraw4 ? "p" : ""}|${game.discardPile.length}`;
      if (turnKeys.get(code) !== key) {
        turnKeys.set(code, key);
        deadlines.set(code, Date.now() + TURN_MS);
        turnTimers.set(code, TURN_MS, () => void onTurnTimeout(code));
      }
    } else {
      turnTimers.clear(code);
      deadlines.delete(code);
      turnKeys.delete(code);
    }

    if (room.seats.every((s) => !s.connected)) {
      cleanupTimers.set(code, EMPTY_ROOM_MS, () => void removeRoom(code));
    } else {
      cleanupTimers.clear(code);
    }
  }

  async function removeRoom(code: string): Promise<void> {
    await lock.run(code, async () => {
      await ctx.deps.rooms.delete(code);
      afterChange(null, code);
      for (const [playerId, roomCode] of playerRooms) {
        if (roomCode === code) playerRooms.delete(playerId);
      }
    });
  }

  async function onTurnTimeout(code: string): Promise<void> {
    await lock.run(code, async () => {
      try {
        const found = await ctx.deps.rooms.get(code);
        if (!found?.game || found.status !== "playing") return;

        let room: Room = found;
        const game = found.game;
        const playerId = game.players[game.current].id;

        if (game.pendingDraw4) {
          room = await acceptDraw4Action(ctx.deps, code, playerId);
        } else {
          if (!game.drawnCardId)
            room = await drawAction(ctx.deps, code, playerId);
          const after = room.game;
          if (
            after?.drawnCardId &&
            after.players[after.current].id === playerId
          ) {
            room = await passAction(ctx.deps, code, playerId);
          }
        }

        afterChange(room, code);
        broadcast(room);
      } catch (err) {
        console.error("turn timeout failed", err);
      }
    });
  }

  // ---------- Authentication for every connection ----------

  io.use(async (socket, next) => {
    try {
      const token = readToken(socket.handshake.headers.cookie);
      if (!token) return next(new Error("unauthorized"));
      socket.data.session = await ctx.tokens.verify(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  // ---------- One connection ----------

  io.on("connection", async (socket) => {
    const session = socket.data.session as Session;
    const me = {
      playerId: session.sub,
      name: session.name,
      isGuest: session.guest,
    };
    const ip = socket.handshake.address;

    disconnectTimers.clear(session.sub);

    async function currentCode(): Promise<string | undefined> {
      const code = playerRooms.get(session.sub);
      if (code && (await ctx.deps.rooms.exists(code))) return code;
      playerRooms.delete(session.sub);
      return undefined;
    }

    async function requireCode(): Promise<string> {
      const code = await currentCode();
      if (!code) throw new RoomError("You are not in a room");
      return code;
    }

    // Runs one use case on the player's room, one at a time, then tells everyone
    async function act(fn: (code: string) => Promise<Room>): Promise<void> {
      const code = await requireCode();
      const room = await lock.run(code, () => fn(code));
      afterChange(room, code);
      broadcast(room);
    }

    // Wraps an event with rate limiting, validation and error handling
    function on<S extends z.ZodTypeAny>(
      event: string,
      schema: S,
      run: (input: z.infer<S>) => Promise<{ code?: string } | undefined>,
    ): void {
      socket.on(event, async (payload: unknown, ack?: Ack) => {
        const reply: Ack = typeof ack === "function" ? ack : () => undefined;

        if (!limiter.allow(session.sub))
          return reply({ ok: false, error: "Slow down a little" });

        const parsed = schema.safeParse(payload ?? {});
        if (!parsed.success)
          return reply({ ok: false, error: "Invalid request" });

        try {
          const result = await run(parsed.data);
          reply({ ok: true, ...(result ?? {}) });
        } catch (err) {
          reply({ ok: false, error: friendlyError(err) });
        }
      });
    }

    // ----- Lobby events -----

    on("room:create", emptySchema, async () => {
      if (
        !createLimiter.allow(`ip:${ip}`) ||
        !createLimiter.allow(`id:${session.sub}`)
      ) {
        throw new RoomError("Too many rooms created, wait a minute");
      }
      if (await currentCode())
        throw new RoomError("Leave your current room first");

      const room = await createRoom(ctx.deps, me);
      playerRooms.set(session.sub, room.code);
      afterChange(room, room.code);
      broadcast(room);
      return { code: room.code };
    });

    on("room:join", joinSchema, async ({ code }) => {
      if (
        !joinLimiter.allow(`ip:${ip}`) ||
        !joinLimiter.allow(`id:${session.sub}`)
      ) {
        throw new RoomError("Too many attempts, wait a minute");
      }

      const normalized = normalizeCode(code);
      const existing = await currentCode();
      if (existing && existing !== normalized)
        throw new RoomError("Leave your current room first");

      const room = await lock.run(normalized, () =>
        joinRoom(ctx.deps, normalized, me),
      );
      playerRooms.set(session.sub, room.code);
      afterChange(room, room.code);
      broadcast(room);
      return { code: room.code };
    });

    on("room:leave", emptySchema, async () => {
      const code = await currentCode();
      if (!code) return undefined;

      const room = await lock.run(code, () =>
        leaveRoom(ctx.deps, code, session.sub),
      );
      playerRooms.delete(session.sub);
      afterChange(room, code);
      if (room) broadcast(room);
      return undefined;
    });

    on("game:start", emptySchema, async () => {
      await act((code) => startGame(ctx.deps, code, session.sub));
      return undefined;
    });

    // ----- Game events -----

    on("game:play", playSchema, async ({ cardId, color }) => {
      await act((code) =>
        playCardAction(ctx.deps, code, session.sub, cardId, color),
      );
      return undefined;
    });

    on("game:draw", emptySchema, async () => {
      await act((code) => drawAction(ctx.deps, code, session.sub));
      return undefined;
    });

    on("game:pass", emptySchema, async () => {
      await act((code) => passAction(ctx.deps, code, session.sub));
      return undefined;
    });

    on("game:uno", emptySchema, async () => {
      await act((code) => unoAction(ctx.deps, code, session.sub));
      return undefined;
    });

    on("game:catch", catchSchema, async ({ targetId }) => {
      await act((code) => catchAction(ctx.deps, code, session.sub, targetId));
      return undefined;
    });

    on("game:accept4", emptySchema, async () => {
      await act((code) => acceptDraw4Action(ctx.deps, code, session.sub));
      return undefined;
    });

    on("game:challenge4", emptySchema, async () => {
      await act((code) => challengeDraw4Action(ctx.deps, code, session.sub));
      return undefined;
    });

    // ----- Emoji taunts -----

    on("emote:send", emoteSchema, async ({ emote }) => {
      if (!emoteLimiter.allow(session.sub))
        throw new RoomError("Too many reactions, calm down");

      const code = await requireCode();
      const room = await getSeatedRoom(ctx.deps, code, session.sub);
      for (const seat of room.seats) {
        io.to(playerChannel(seat.playerId)).emit("emote:received", {
          from: session.sub,
          name: session.name,
          emote,
        });
      }
      return undefined;
    });

    // ----- Disconnects -----

    socket.on("disconnect", () => {
      // A short grace period covers page refreshes and brief network drops
      disconnectTimers.set(session.sub, DISCONNECT_GRACE_MS, () => {
        void (async () => {
          const remaining = await io
            .in(playerChannel(session.sub))
            .fetchSockets();
          if (remaining.length > 0) return; // still connected from another tab

          const code = playerRooms.get(session.sub);
          if (!code) return;

          try {
            const room = await lock.run(code, () =>
              leaveRoom(ctx.deps, code, session.sub),
            );
            if (!room || room.status === "lobby")
              playerRooms.delete(session.sub);
            afterChange(room, code);
            if (room) broadcast(room);
          } catch {
            playerRooms.delete(session.sub);
          }
        })();
      });
    });

    // ----- Join the private channel and resume an earlier session -----

    await socket.join(playerChannel(session.sub));

    const resumeCode = playerRooms.get(session.sub);
    if (resumeCode) {
      try {
        const room = await lock.run(resumeCode, () =>
          joinRoom(ctx.deps, resumeCode, me),
        );
        afterChange(room, resumeCode);
        broadcast(room);
      } catch {
        playerRooms.delete(session.sub);
      }
    }
  });

  return io;
}
