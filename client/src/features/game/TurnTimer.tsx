"use client";

import { useSecondsLeft } from "./useSecondsLeft";

export default function TurnTimer({ endsAt, urgent }: { endsAt: number | null; urgent: boolean }) {
  const left = useSecondsLeft(endsAt);
  if (left === null) return <span className="w-10" />;

  const hot = urgent && left <= 10;
  return (
    <span
      className={`min-w-10 rounded-full px-3 py-1 text-center text-sm font-extrabold tabular-nums ${
        hot ? "bg-sindoor text-white" : "bg-ink/10 text-ink"
      }`}
    >
      {left}
    </span>
  );
}
