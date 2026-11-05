import { io, type Socket } from "socket.io-client";
import { API_URL, getToken } from "./api";

export type ConnState = "connecting" | "connected" | "offline" | "unauthorized";

let socket: Socket | null = null;

// Connection state and the current room live here, outside React, so components
// can subscribe to them with useSyncExternalStore instead of copying them into state.
let connState: ConnState = "connecting";
let activeRoomCode: string | null = null;
const connListeners = new Set<() => void>();
const roomListeners = new Set<() => void>();

function setConnState(next: ConnState): void {
  if (connState === next) return;
  connState = next;
  connListeners.forEach((listener) => listener());
}

function setActiveRoom(next: string | null): void {
  if (activeRoomCode === next) return;
  activeRoomCode = next;
  roomListeners.forEach((listener) => listener());
}

export function subscribeConn(listener: () => void): () => void {
  connListeners.add(listener);
  return () => {
    connListeners.delete(listener);
  };
}

export function getConnState(): ConnState {
  return connState;
}

export function subscribeActiveRoom(listener: () => void): () => void {
  roomListeners.add(listener);
  return () => {
    roomListeners.delete(listener);
  };
}

export function getActiveRoomCode(): string | null {
  return activeRoomCode;
}

export function clearActiveRoom(): void {
  setActiveRoom(null);
}

// Created on first use, so it never runs during server side rendering
export function getSocket(): Socket {
  if (!socket) {
    // The session token is read again on every connection attempt, so reconnects stay signed in
    const s = io(API_URL, {
      autoConnect: false,
      auth: (send) => send({ token: getToken() }),
    });
    s.on("connect", () => setConnState("connected"));
    s.on("disconnect", () => setConnState("offline"));
    s.on("connect_error", (err: Error) =>
      setConnState(err.message === "unauthorized" ? "unauthorized" : "offline"),
    );
    // Remember which room we are in, so the home screen can offer a way back
    s.on("room:state", (room: { code: string }) => setActiveRoom(room.code));
    socket = s;
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  setConnState("connecting");
  setActiveRoom(null);
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