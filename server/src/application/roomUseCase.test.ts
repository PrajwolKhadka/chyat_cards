import { describe, it, expect } from "vitest";
import { MemoryRoomRepository } from "../infrastructure/MemoryRoomRepository";
import { Deps } from "./deps";
import { createRoom, joinRoom, startGame, leaveRoom } from "./roomUseCase";


const guest = (id: string, name: string) => ({ playerId: id, name, isGuest: true });

function setup(rng = (max: number) => Math.floor(Math.random() * max)) {
  let time = 1000;
  const deps: Deps = { rooms: new MemoryRoomRepository(), rng, now: () => time++ };
  return deps;
}

describe("createRoom", () => {
  it("creates a lobby with the host seated", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    expect(room.code).toHaveLength(5);
    expect(room.status).toBe("lobby");
    expect(room.hostId).toBe("h");
    expect(room.seats).toHaveLength(1);
    expect(await deps.rooms.exists(room.code)).toBe(true);
  });

  it("gives up when every generated code is already taken", async () => {
    const deps = setup(() => 0); // always produces the same code
    await createRoom(deps, guest("h1", "One"));
    await expect(createRoom(deps, guest("h2", "Two"))).rejects.toThrow("try again");
  });
});

describe("joinRoom", () => {
  it("joins with a lowercase code and extra spaces", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    const joined = await joinRoom(deps, `  ${room.code.toLowerCase()} `, guest("p1", "Sita"));
    expect(joined.seats).toHaveLength(2);
  });

  it("rejects unknown and badly formatted codes with the same message", async () => {
    const deps = setup();
    await expect(joinRoom(deps, "ZZZZZ", guest("p", "A"))).rejects.toThrow("Room not found");
    await expect(joinRoom(deps, "!!", guest("p", "A"))).rejects.toThrow("Room not found");
  });

  it("rejects a duplicate name", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Ram"));
    await expect(joinRoom(deps, room.code, guest("p1", "ram"))).rejects.toThrow("already taken");
  });

  it("rejects an 11th player", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    for (let i = 1; i <= 9; i++) {
      await joinRoom(deps, room.code, guest(`p${i}`, `Player${i}`));
    }
    await expect(joinRoom(deps, room.code, guest("p10", "Player10"))).rejects.toThrow("full");
  });
});

describe("startGame", () => {
  it("lets only the host start, and needs 2 players", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    await expect(startGame(deps, room.code, "h")).rejects.toThrow("at least 2");

    await joinRoom(deps, room.code, guest("p1", "Sita"));
    await expect(startGame(deps, room.code, "p1")).rejects.toThrow("Only the host");

    const started = await startGame(deps, room.code, "h");
    expect(started.status).toBe("playing");
    expect(started.game?.players.every((p) => p.hand.length === 7)).toBe(true);
  });

  it("blocks new players after the start but lets a seated player rejoin", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    await joinRoom(deps, room.code, guest("p1", "Sita"));
    await startGame(deps, room.code, "h");

    await expect(joinRoom(deps, room.code, guest("p2", "Late"))).rejects.toThrow("already started");

    await leaveRoom(deps, room.code, "p1");
    const rejoined = await joinRoom(deps, room.code, guest("p1", "Sita"));
    expect(rejoined.seats.find((s) => s.playerId === "p1")?.connected).toBe(true);
  });
});

describe("leaveRoom", () => {
  it("passes the host role on when the host leaves the lobby", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    await joinRoom(deps, room.code, guest("p1", "Sita"));
    const after = await leaveRoom(deps, room.code, "h");
    expect(after?.hostId).toBe("p1");
    expect(after?.seats).toHaveLength(1);
  });

  it("deletes the room when the last player leaves the lobby", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    expect(await leaveRoom(deps, room.code, "h")).toBeNull();
    expect(await deps.rooms.exists(room.code)).toBe(false);
  });

  it("keeps the seat but marks the player disconnected during a game", async () => {
    const deps = setup();
    const room = await createRoom(deps, guest("h", "Host"));
    await joinRoom(deps, room.code, guest("p1", "Sita"));
    await startGame(deps, room.code, "h");

    const after = await leaveRoom(deps, room.code, "p1");
    expect(after?.seats).toHaveLength(2);
    expect(after?.seats.find((s) => s.playerId === "p1")?.connected).toBe(false);
  });
});