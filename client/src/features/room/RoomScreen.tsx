"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/ui/Shell";
import Toast from "@/components/ui/Toast";
import { ghost, primary } from "@/components/ui/styles";
import { useAuth } from "@/features/auth/AuthProvider";
import LoginCard from "@/features/auth/LoginCard";
import GameTable from "@/features/game/GameTable";
import Lobby from "@/features/room/Lobby";
import { RoomProvider, useRoom } from "@/features/room/RoomProvider";

function RoomBrand({ code }: { code: string }) {
  return (
    <header className="mb-7 text-center">
      <Link href="/" className="inline-block">
        <h1 className="font-display text-5xl font-black leading-none text-sindoor">
          उनो
        </h1>
        <p className="mt-2 text-xs font-bold tracking-[0.3em] text-dhaka">
          CHYAT CARDS
        </p>
      </Link>

      <div className="mx-auto mt-4 flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-terrace/30" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink/40">
          Room {code}
        </span>
        <span className="h-px w-8 bg-terrace/30" />
      </div>
    </header>
  );
}

function RoomMessage({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-md flex-col justify-center">
        <RoomBrand code={code} />

        <div className="relative overflow-hidden rounded-[26px] border border-dhaka/10 bg-[#FFFEFA] p-6 shadow-[0_12px_40px_rgba(37,41,39,0.07)] sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-terrace" />
          {children}
        </div>
      </div>
    </Shell>
  );
}

function RoomGate({ code }: { code: string }) {
  const { room, conn, toast, join, leave } = useRoom();
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const tried = useRef("");

  // useEffect(() => {
  //   if (conn !== "connected") return;

  //   if (room) {
  //     // Already seated somewhere else, so go there
  //     if (room.code !== code) router.replace(`/room/${room.code}`);
  //     return;
  //   }

  //   const key = `${code}:${attempt}`;
  //   if (tried.current === key) return;
  //   tried.current = key;
  //   join(code).catch((err: Error) => setError(err.message));
  // }, [conn, room, code, attempt, join, router]);
  useEffect(() => {
    if (conn !== "connected") return;
    if (room) return;

    const key = `${code}:${attempt}`;
    if (tried.current === key) return;
    tried.current = key;
    join(code).catch((err: Error) => setError(err.message));
  }, [conn, room, code, attempt, join]);

  async function switchRoom() {
    await leave();
    setError("");
    setAttempt((a) => a + 1);
  }

  if (conn === "unauthorized") {
    return (
      <RoomMessage code={code}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sindoor/10 text-2xl text-sindoor">
            !
          </div>

          <div>
            <p className="text-xl font-extrabold text-dhaka">Session expired</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">
              Your session has expired. Sign in again to continue playing.
            </p>
          </div>

          <Link
            href="/"
            className={`${primary} flex h-12 items-center justify-center rounded-2xl font-bold`}
          >
            Sign in again
          </Link>
        </div>
      </RoomMessage>
    );
  }

  if (!room) {
    if (error) {
      return (
        <RoomMessage code={code}>
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sindoor/20 bg-sindoor/5 text-2xl font-bold text-sindoor">
              !
            </div>

            <div>
              <p className="text-xl font-extrabold text-sindoor">
                Unable to join
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                {error}
              </p>
            </div>

            {error.includes("Leave your current room") && (
              <button
                className={`${primary} !h-12 !rounded-2xl`}
                onClick={() => void switchRoom()}
              >
                Leave it and join {code}
              </button>
            )}

            <Link
              href="/"
              className={`${ghost} flex min-h-11 items-center justify-center rounded-xl`}
            >
              ← Back to home
            </Link>
          </div>
        </RoomMessage>
      );
    }

    return (
      <RoomMessage code={code}>
        <div className="py-5 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-terrace/20 bg-terrace/5">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-terrace/20 border-t-terrace" />
          </div>

          <p className="text-lg font-extrabold text-dhaka">
            {conn === "offline" ? "Reconnecting..." : "Joining your room"}
          </p>

          <p className="mt-2 text-sm text-ink/50">
            {conn === "offline"
              ? "Trying to restore your connection."
              : "Getting everything ready. Just a moment."}
          </p>

          <p className="mt-6 font-mono text-2xl font-black tracking-[0.35em] text-sindoor">
            {code}
          </p>
        </div>
      </RoomMessage>
    );
  }

  return (
    <>
      {conn !== "connected" && (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-marigold/30 bg-marigold px-3 py-2 text-center text-xs font-bold text-ink shadow-sm">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-ink/60" />
          Connection lost. Reconnecting...
        </div>
      )}

      <Toast message={toast} />

      {room.status === "lobby" || !room.game ? (
        <Lobby room={room} />
      ) : (
        <GameTable room={room} game={room.game} />
      )}
    </>
  );
}

export default function RoomScreen({ code }: { code: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <RoomMessage code={code}>
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-[3px] border-terrace/20 border-t-terrace" />
          <p className="text-sm font-semibold text-ink/55">Loading...</p>
        </div>
      </RoomMessage>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md">
          <RoomBrand code={code} />
          <LoginCard title={`Join room ${code}`} />
        </div>
      </Shell>
    );
  }

  return (
    <RoomProvider code={code}>
      <RoomGate code={code} />
    </RoomProvider>
  );
}
