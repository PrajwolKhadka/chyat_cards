import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;
let activeRoomCode: string | null = null;

// Created on first use, so it never runs during server side rendering
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: false });
    // Remember which room we are in, so the home screen can offer a way back
    socket.on("room:state", (room: { code: string }) => {
      activeRoomCode = room.code;
    });
  }
  return socket;
}

export function getActiveRoomCode(): string | null {
  return activeRoomCode;
}

export function clearActiveRoom(): void {
  activeRoomCode = null;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  activeRoomCode = null;
}

type Ack = { ok: true; code?: string } | { ok: false; error: string };

// Sends an event and waits for the server's answer
export function emitAck(event: string, payload?: unknown): Promise<{ code?: string }> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) s.connect();

    s.timeout(8000).emit(event, payload ?? {}, (err: Error | null, res: Ack) => {
      if (err) return reject(new Error("The server did not respond, try again"));
      if (!res.ok) return reject(new Error(res.error));
      resolve({ code: res.code });
    });
  });
}
