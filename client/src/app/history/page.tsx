"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/ui/Shell";
import { card, ghost } from "@/components/ui/styles";
import { useAuth } from "@/features/auth/AuthProvider";
import LoginCard from "@/features/auth/LoginCard";
import { getHistory, type HistoryResponse } from "@/lib/api";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.isGuest) return;
    getHistory()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-ink/60">Loading...</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <LoginCard title="Sign in to see your history" />
      </Shell>
    );
  }

  if (user.isGuest) {
    return (
      <Shell>
        <div className={`${card} space-y-4 text-center`}>
          <p className="font-bold text-dhaka">Guests do not have a win history</p>
          <p className="text-sm text-ink/70">Sign out and continue with Google to keep your results.</p>
          <Link href="/" className={`${ghost} flex items-center justify-center`}>
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  const rate = data && data.stats.played > 0 ? Math.round((data.stats.won / data.stats.played) * 100) : 0;

  return (
    <Shell>
      <h1 className="text-center font-display text-3xl text-dhaka">My games</h1>

      {error && <p className="text-center text-sm font-semibold text-sindoor">{error}</p>}
      {!data && !error && <p className="text-center text-ink/60">Loading...</p>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Played", value: data.stats.played },
              { label: "Won", value: data.stats.won },
              { label: "Win rate", value: `${rate}%` },
            ].map((s) => (
              <div key={s.label} className={card}>
                <p className="text-2xl font-extrabold text-sindoor">{s.value}</p>
                <p className="text-xs text-ink/60">{s.label}</p>
              </div>
            ))}
          </div>

          {data.matches.length === 0 ? (
            <p className="text-center text-sm text-ink/60">No games yet. Go play one!</p>
          ) : (
            <ul className="space-y-2">
              {data.matches.map((m) => (
                <li key={`${m.roomCode}-${m.finishedAt}`} className={`${card} !p-3`}>
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-extrabold text-white ${
                        m.won ? "bg-terrace" : "bg-ink/50"
                      }`}
                    >
                      {m.won ? "Won" : "Lost"}
                    </span>
                    <span className="text-xs text-ink/60">{new Date(m.finishedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink/80">{m.players.map((p) => p.name).join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link href="/" className={`${ghost} flex items-center justify-center`}>
        Back to home
      </Link>
    </Shell>
  );
}
