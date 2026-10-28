import {
  RoomError,
  addSeat,
  generateRoomCode,
  isValidCode,
  leaveRoom as leaveSeat,
  newRoom,
  normalizeCode,
  startRoomGame,
  type NewPlayer,
  type Room,
} from "../domain/room";
import type { Deps } from "./deps";

const MAX_CODE_ATTEMPTS = 10;

// Same message for a badly formatted code and a missing room,
// so an attacker cannot learn which codes are shaped correctly
async function getRoomOrThrow(deps: Deps, rawCode: string): Promise<Room> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) throw new RoomError("Room not found");

  const room = await deps.rooms.get(code);
  if (!room) throw new RoomError("Room not found");
  return room;
}

export async function createRoom(deps: Deps, host: NewPlayer): Promise<Room> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode(deps.rng);
    if (await deps.rooms.exists(code)) continue;

    const room = newRoom(code, host, deps.now());
    await deps.rooms.save(room);
    return room;
  }
  throw new RoomError("Could not create a room, please try again");
}

export async function joinRoom(deps: Deps, rawCode: string, player: NewPlayer): Promise<Room> {
  const room = await getRoomOrThrow(deps, rawCode);
  const updated = addSeat(room, player);
  await deps.rooms.save(updated);
  return updated;
}

// Returns null when the room was removed because nobody is left in the lobby
export async function leaveRoom(deps: Deps, rawCode: string, playerId: string): Promise<Room | null> {
  const room = await getRoomOrThrow(deps, rawCode);
  const updated = leaveSeat(room, playerId);

  if (updated.status === "lobby" && updated.seats.length === 0) {
    await deps.rooms.delete(updated.code);
    return null;
  }

  await deps.rooms.save(updated);
  return updated;
}

export async function startGame(deps: Deps, rawCode: string, playerId: string): Promise<Room> {
  const room = await getRoomOrThrow(deps, rawCode);
  const updated = startRoomGame(room, playerId, deps.rng);
  await deps.rooms.save(updated);
  return updated;
}