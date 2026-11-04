"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/ui/Shell";
import { card, ghost, primary } from "@/components/ui/styles";
import type { RoomView } from "@/lib/types";
import { useRoom } from "./RoomProvider";

const AVATAR_COLORS = ["bg-sindoor", "bg-marigold text-ink", "bg-terrace", "bg-himal"];

export default function Lobby({ room }: { room: RoomView }) {
  const { start, leave } = useRoom();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const isHost = room.hostId === room.you;
  const enough = room.seats.length >= 2;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // copying can be blocked by the browser, the code is still on screen
    }
  }

  async function share() {
    const url = `${window.location.origin}/room/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "UNO Nepal", text: `Join my UNO room ${room.code}`, url });
      } catch {
        // the player closed the share sheet
      }
    } else {
      await copy(url);
    }
  }

  async function onStart() {
    setBusy(true);
    await start();
    setBusy(false);
  }

  async function onLeave() {
    await leave();
    router.push("/");
  }

  return (
    <Shell>
      <div className={`${card} space-y-4 text-center`}>
        <p className="text-sm font-semibold text-ink/60">Room code</p>
        <p className="font-display text-6xl tracking-[0.2em] text-sindoor">{room.code}</p>
        <div className="grid grid-cols-2 gap-3">
          <button className={ghost} onClick={() => void copy(room.code)}>
            {copied ? "Copied" : "Copy code"}
          </button>
          <button className={ghost} onClick={() => void share()}>
            Share link
          </button>
        </div>
      </div>

      <div className={`${card} space-y-3`}>
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-dhaka">Players</p>
          <p className="text-sm text-ink/60">{room.seats.length} of 10</p>
        </div>

        <ul className="space-y-2">
          {room.seats.map((seat, i) => (
            <li
              key={seat.playerId}
              className={`flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-ink/10 ${
                seat.connected ? "" : "opacity-50"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold text-white ${
                  AVATAR_COLORS[i % AVATAR_COLORS.length]
                }`}
              >
                {seat.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate font-bold">
                {seat.name}
                {seat.playerId === room.you && <span className="ml-1 text-xs text-ink/50">(you)</span>}
              </span>
              {seat.isHost && <span className="text-sm font-bold text-marigold">👑 Host</span>}
              {seat.isGuest && <span className="text-xs text-ink/50">guest</span>}
              {!seat.connected && <span className="text-xs text-ink/50">offline</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-center text-sm font-semibold text-dhaka">
          {isHost
            ? enough
              ? "Everyone in? Start when you are ready"
              : "Waiting for at least one more player"
            : "Waiting for the host to start"}
        </p>
        {isHost && (
          <button className={primary} disabled={!enough || busy} onClick={() => void onStart()}>
            Start game
          </button>
        )}
        <button className={ghost} onClick={() => void onLeave()}>
          Leave room
        </button>
      </div>
    </Shell>
  );
}
