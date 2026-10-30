import type { Color } from "../domain/card";
import {
  acceptDraw4,
  callUno,
  catchUno,
  challengeDraw4,
  drawCard,
  passTurn,
  playCard,
  type GameState,
} from "../domain/game";
import { RoomError, normalizeCode, withGame, type Room } from "../domain/room";
import type { Deps } from "./deps";
import { MatchRepository } from "./ports/Persistance";

export type GameDeps = Deps & { matches: MatchRepository };

async function recordMatch(deps: GameDeps, room: Room): Promise<void> {
  const game = room.game;
  if (!game) return;
  try {
    await deps.matches.save({
      roomCode: room.code,
      finishedAt: deps.now(),
      winnerId: game.winnerId ?? "",
      players: game.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        isGuest: room.seats.find((s) => s.playerId === p.id)?.isGuest ?? true,
        cardsLeft: p.hand.length,
      })),
    });
  } catch (err) {
    // A database problem must never break a finished game
    console.error("could not save match", err);
  }
}

async function apply(
  deps: GameDeps,
  rawCode: string,
  change: (game: GameState) => GameState,
): Promise<Room> {
  const room = await deps.rooms.get(normalizeCode(rawCode));
  if (!room || !room.game || room.status !== "playing") {
    throw new RoomError("No game in progress");
  }

  const updated = withGame(room, change(room.game));
  await deps.rooms.save(updated);
  if (updated.status === "finished") await recordMatch(deps, updated);
  return updated;
}

export const playCardAction = (
  deps: GameDeps,
  code: string,
  playerId: string,
  cardId: string,
  color?: Color,
) => apply(deps, code, (g) => playCard(g, playerId, cardId, deps.rng, color));

export const drawAction = (deps: GameDeps, code: string, playerId: string) =>
  apply(deps, code, (g) => drawCard(g, playerId, deps.rng));

export const passAction = (deps: GameDeps, code: string, playerId: string) =>
  apply(deps, code, (g) => passTurn(g, playerId));

export const unoAction = (deps: GameDeps, code: string, playerId: string) =>
  apply(deps, code, (g) => callUno(g, playerId));

export const catchAction = (deps: GameDeps, code: string, catcherId: string, targetId: string) =>
  apply(deps, code, (g) => catchUno(g, catcherId, targetId, deps.rng));

export const acceptDraw4Action = (deps: GameDeps, code: string, playerId: string) =>
  apply(deps, code, (g) => acceptDraw4(g, playerId, deps.rng));

export const challengeDraw4Action = (deps: GameDeps, code: string, playerId: string) =>
  apply(deps, code, (g) => challengeDraw4(g, playerId, deps.rng));

export async function getSeatedRoom(deps: GameDeps, rawCode: string, playerId: string): Promise<Room> {
  const room = await deps.rooms.get(normalizeCode(rawCode));
  if (!room || !room.seats.some((s) => s.playerId === playerId)) {
    throw new RoomError("Room not found");
  }
  return room;
}