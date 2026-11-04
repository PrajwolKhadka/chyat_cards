"use client";

import { useState, type FormEvent } from "react";
import { card, input, secondary } from "@/components/ui/styles";
import { useAuth } from "./AuthProvider";

export default function LoginCard({ title }: { title?: string }) {
  const { loginGuest } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onGuest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginGuest(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} space-y-5`}>
      {title && <p className="text-center text-lg font-extrabold text-dhaka">{title}</p>}

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
          Play
        </button>
      </form>

      {error && <p className="text-center text-sm font-semibold text-sindoor">{error}</p>}
    </div>
  );
}