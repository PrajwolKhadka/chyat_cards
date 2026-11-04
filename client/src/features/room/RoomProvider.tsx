"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearActiveRoom, emitAck, getSocket } from "@/lib/socket";
import type { Color, EmoteId, RoomView } from "@/lib/types";

export type ConnState = "connecting" | "connected" | "offline" | "unauthorized";
export type EmoteBubble = {
  id: number;
  from: string;
  name: string;
  emote: EmoteId;
};

type RoomContextValue = {
  room: RoomView | null;
  conn: ConnState;
  bubbles: EmoteBubble[];
  toast: string;
  join: (code: string) => Promise<void>;
  leave: () => Promise<void>;
  start: () => Promise<void>;
  play: (cardId: string, color?: Color) => Promise<void>;
  draw: () => Promise<void>;
  pass: () => Promise<void>;
  uno: () => Promise<void>;
  catchUno: (targetId: string) => Promise<void>;
  accept4: () => Promise<void>;
  challenge4: () => Promise<void>;
  sendEmote: (emote: EmoteId) => Promise<void>;
};

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [conn, setConn] = useState<ConnState>(() =>
    getSocket().connected ? "connected" : "connecting",
  );
  const [bubbles, setBubbles] = useState<EmoteBubble[]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleId = useRef(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onState = (view: RoomView) => {
      if (view.code === code) setRoom(view);
    };
    const onConnect = () => setConn("connected");
    const onDisconnect = () => setConn("offline");

    const onConnectError = (err: Error) =>
      setConn(err.message === "unauthorized" ? "unauthorized" : "offline");

    const onEmote = (e: { from: string; name: string; emote: EmoteId }) => {
      const id = ++bubbleId.current;

      setBubbles((list) => [...list.slice(-4), { id, ...e }]);

      setTimeout(() => {
        setBubbles((list) => list.filter((b) => b.id !== id));
      }, 2600);
    };

    socket.on("room:state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("emote:received", onEmote);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("room:state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("emote:received", onEmote);

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [code]);

  // Runs a game action and shows any error from the server as a small message
  const run = useCallback(
    async (event: string, payload?: unknown) => {
      try {
        await emitAck(event, payload);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [showToast],
  );

  const value = useMemo<RoomContextValue>(
    () => ({
      room,
      conn,
      bubbles,
      toast,
      join: async (code) => {
        await emitAck("room:join", { code });
      },
      leave: async () => {
        try {
          await emitAck("room:leave");
        } catch {
          // the server frees the seat on its own when the connection drops
        }
        clearActiveRoom();
        setRoom(null);
      },
      start: () => run("game:start"),
      play: (cardId, color) => run("game:play", { cardId, color }),
      draw: () => run("game:draw"),
      pass: () => run("game:pass"),
      uno: () => run("game:uno"),
      catchUno: (targetId) => run("game:catch", { targetId }),
      accept4: () => run("game:accept4"),
      challenge4: () => run("game:challenge4"),
      sendEmote: (emote) => run("emote:send", { emote }),
    }),
    [room, conn, bubbles, toast, run],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}
