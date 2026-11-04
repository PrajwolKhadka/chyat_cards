"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Shell from "@/components/ui/Shell";
import { input, primary, secondary } from "@/components/ui/styles";
import { useAuth } from "@/features/auth/AuthProvider";
import LoginCard from "@/features/auth/LoginCard";
import { useActiveRoom } from "@/features/room/useActiveRoom";
import { API_URL } from "@/lib/api";
import { emitAck } from "@/lib/socket";

function MenuCard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const activeRoom = useActiveRoom();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const create = () =>
    run(async () => {
      const res = await emitAck("room:create");
      router.push(`/room/${res.code}`);
    });

  const join = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await emitAck("room:join", { code });
      router.push(`/room/${res.code}`);
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-dhaka/15 bg-[#FFFEFA] p-5 shadow-[0_12px_40px_rgba(37,41,39,0.08)] sm:p-7">
      {/* Decorative top border */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-terrace" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full border border-sindoor/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-sindoor/10" />

      {/* User identity */}
      <div className="relative mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-terrace/20 bg-terrace/10 text-xl text-terrace">
          ✳
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
          Namaste
        </p>

        <p className="mt-1 text-2xl font-extrabold tracking-tight text-dhaka">
          {user?.name}
        </p>

        <p className="mt-1 text-xs text-ink/50">Guest player</p>
      </div>

      {/* Active room */}
      {activeRoom && (
        <Link
          href={`/room/${activeRoom}`}
          className="mb-5 flex min-h-14 items-center justify-between rounded-2xl border border-terrace/20 bg-terrace/5 px-4 text-sm font-bold text-terrace transition-colors hover:bg-terrace/10 active:scale-[0.98]"
        >
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-terrace/60">
              Continue playing
            </span>
            Back to your room
          </span>
          <span className="font-mono text-lg tracking-widest">
            {activeRoom} →
          </span>
        </Link>
      )}

      {/* Create room */}
      <button
        className={`${primary} !h-14 !rounded-2xl !text-base !font-bold shadow-[0_4px_0_rgba(0,0,0,0.12)] transition-all active:translate-y-1 active:shadow-none`}
        disabled={busy}
        onClick={() => void create()}
      >
        <span className="mr-2">✳</span>
        Create a room
      </button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-dhaka/10" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink/40">
          Or join friends
        </span>
        <div className="h-px flex-1 bg-dhaka/10" />
      </div>

      {/* Join room */}
      <form onSubmit={join} className="space-y-3">
        <label className="block text-center text-xs font-bold uppercase tracking-widest text-ink/60">
          Enter room code
        </label>

        <input
          className={`${input} !h-16 !rounded-2xl !border-2 !border-dhaka/10 !bg-[#F8F6F0] text-center !text-2xl !font-extrabold uppercase tracking-[0.45em] placeholder:!text-ink/20 focus:!border-terrace`}
          placeholder="CODE"
          value={code}
          maxLength={5}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />

        <button
          className={`${secondary} !h-12 !rounded-2xl !font-bold transition-all active:scale-[0.98]`}
          disabled={busy || code.length !== 5}
        >
          Join with code <span className="ml-1">→</span>
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="mt-4 rounded-xl border border-sindoor/20 bg-sindoor/5 px-3 py-2 text-center text-sm font-semibold text-sindoor">
          {error}
        </p>
      )}

      {/* Account actions */}
      <div className="mt-6 border-t border-dhaka/10 pt-4">
        <button
          className="mt-2 w-full py-3 text-xs font-semibold tracking-wide text-ink/45 transition-colors hover:text-sindoor"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  // A sleeping server takes a while to start, so wake it as soon as someone opens the site
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => undefined);
  }, []);

  return (
    <Shell>
      <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
        {/* Brand */}
        <header className="relative mb-8 w-full pt-5 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-sindoor/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-dhaka/50">
              A Nepali card game
            </span>
            <span className="h-px w-10 bg-sindoor/40" />
          </div>

          <h1 className="font-display text-8xl font-black leading-none tracking-tight text-sindoor drop-shadow-[0_2px_0_rgba(0,0,0,0.06)]">
            उनो
          </h1>

          <div className="mx-auto mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-terrace/40" />
            <p className="font-display text-lg font-bold tracking-[0.32em] text-dhaka">
              CHYAT CARDS
            </p>
            <span className="h-px w-8 bg-terrace/40" />
          </div>

          <p className="mt-3 text-sm text-ink/55">
            Play with friends, wherever they are.
          </p>
        </header>

        {/* Small decorative motif */}
        <div className="mb-5 flex items-center gap-2 text-terrace/40">
          <span className="text-xs">✳</span>
          <span className="h-px w-8 bg-terrace/20" />
          <span className="text-[9px] font-bold tracking-[0.3em]">
            LET THE GAME BEGIN
          </span>
          <span className="h-px w-8 bg-terrace/20" />
          <span className="text-xs">✳</span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-ink/50">Loading...</p>
        ) : user ? (
          <MenuCard />
        ) : (
          <LoginCard />
        )}

        <footer className="mt-8 pb-5 text-center">
          <p className="text-[10px] font-medium tracking-[0.2em] text-ink/35">
            MADE FOR GOOD TIMES
          </p>
        </footer>
      </div>
    </Shell>
  );
}