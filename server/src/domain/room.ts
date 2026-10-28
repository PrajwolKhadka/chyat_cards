import type { Rng } from "./deck";
import { startGame, type GameState } from "./game";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export class RoomError extends Error {}

// Karauna sajilo codes
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export function generateRoomCode(rng: Rng): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[rng(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((ch) => CODE_ALPHABET.includes(ch));
}

export type Seat = {
  playerId: string; // user id for logged in players, a generated id for guests
  name: string;
  isGuest: boolean;
  connected: boolean;
};

export type RoomStatus = "lobby" | "playing" | "finished";

export type Room = {
  code: string;
  hostId: string;
  seats: Seat[];
  status: RoomStatus;
  game: GameState | null;
  createdAt: number;
};

export type NewPlayer = {
  playerId: string;
  name: string;
  isGuest: boolean;
};


export function cleanName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 20) {
    throw new RoomError("Name must be 1 to 20 characters");
  }
  return name;
}

export function newRoom(code: string, host: NewPlayer, now: number): Room {
  return {
    code,
    hostId: host.playerId,
    seats: [
      { playerId: host.playerId, name: cleanName(host.name), isGuest: host.isGuest, connected: true },
    ],
    status: "lobby",
    game: null,
    createdAt: now,
  };
}

export function setConnected(room: Room, playerId: string, connected: boolean): Room {
  if (!room.seats.some((s) => s.playerId === playerId)) {
    throw new RoomError("You are not in this room");
  }
  return {
    ...room,
    seats: room.seats.map((s) => (s.playerId === playerId ? { ...s, connected } : s)),
  };
}

export function addSeat(room: Room, player: NewPlayer): Room {
  // A player who is already seated is simply rejoining after a dropped connection
  if (room.seats.some((s) => s.playerId === player.playerId)) {
    return setConnected(room, player.playerId, true);
  }

  if (room.status !== "lobby") throw new RoomError("This game has already started");
  if (room.seats.length >= MAX_PLAYERS) throw new RoomError("This room is full");

  const name = cleanName(player.name);
  if (room.seats.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    throw new RoomError("That name is already taken in this room");
  }

  return {
    ...room,
    seats: [...room.seats, { playerId: player.playerId, name, isGuest: player.isGuest, connected: true }],
  };
}

export function leaveRoom(room: Room, playerId: string): Room {
  if (!room.seats.some((s) => s.playerId === playerId)) {
    throw new RoomError("You are not in this room");
  }

  // During a game the seat stays so the player can come back
  if (room.status !== "lobby") return setConnected(room, playerId, false);

  const seats = room.seats.filter((s) => s.playerId !== playerId);
  const hostId = room.hostId === playerId ? (seats[0]?.playerId ?? room.hostId) : room.hostId;
  return { ...room, seats, hostId };
}

export function isRoomEmpty(room: Room): boolean {
  return room.seats.length === 0 || room.seats.every((s) => !s.connected);
}

export function startRoomGame(room: Room, byPlayerId: string, rng: Rng): Room {
  if (room.hostId !== byPlayerId) throw new RoomError("Only the host can start the game");
  if (room.status !== "lobby") throw new RoomError("The game has already started");
  if (room.seats.length < MIN_PLAYERS) throw new RoomError("You need at least 2 players");

  const game = startGame(
    room.seats.map((s) => ({ id: s.playerId, name: s.name })),
    rng,
  );
  return { ...room, status: "playing", game };
}

// Used after every game action to store the new game state in the room
export function withGame(room: Room, game: GameState): Room {
  return { ...room, game, status: game.status === "finished" ? "finished" : "playing" };
}