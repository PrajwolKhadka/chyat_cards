"use client";

import { useState, type FormEvent } from "react";
import { card, input, secondary } from "@/components/ui/styles";
import { useAuth } from "./AuthProvider";
import GoogleButton from "./GoogleButton";

export default function LoginCard({ title }: { title?: string }) {
  const { loginGuest, loginGoogle } = useAuth();
  const [name, setName] = useState("");
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

  function onGuest(e: FormEvent) {
    e.preventDefault();
    void run(() => loginGuest(name));
  }

  return (
    <div className={`${card} space-y-5`}>
      {title && <p className="text-center text-lg font-extrabold text-dhaka">{title}</p>}

      {/* <div className="space-y-3">
        <p className="text-center text-sm font-semibold text-dhaka">Sign in to keep your win history</p>
        <GoogleButton onCredential={(credential) => void run(() => loginGoogle(credential))} />
      </div> */}

      {/* <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink/50">
        <span className="h-px flex-1 bg-ink/15" />
        or
        <span className="h-px flex-1 bg-ink/15" />
      </div> */}

      <form onSubmit={onGuest} className="space-y-3">
        <input
          className={input}
          placeholder="Your name"
          value={name}
          maxLength={20}
          autoComplete="nickname"
          enterKeyHint="go"
          onChange={(e) => setName(e.target.value)}
        />
        <button className={secondary} disabled={busy || name.trim().length === 0}>
          Play as {name.trim()}
        </button>
      </form>

      {error && <p className="text-center text-sm font-semibold text-sindoor">{error}</p>}
    </div>
  );
}
