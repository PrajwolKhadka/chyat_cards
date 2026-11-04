
import Card from "@/components/cards/Card";
import type { SeatView } from "@/lib/types";

type Props = {
  seat: SeatView;
  active: boolean;
  called: boolean;
  vulnerable: boolean;
  onCatch: () => void;
};

export default function OpponentChip({
  seat,
  active,
  called,
  vulnerable,
  onCatch,
}: Props) {
  return (
    <div
      className={`relative flex min-h-[108px] w-24 shrink-0 flex-col items-center justify-start gap-1 rounded-2xl bg-white/80 px-2 py-2 text-center shadow ring-2 ${
        active
          ? "turn-pulse ring-marigold"
          : "ring-transparent"
      } ${seat.connected ? "" : "opacity-50"}`}
    >
      {/* Opponent card */}
      <div className="relative flex h-[50px] shrink-0 items-start justify-center">
        <Card card={null} width={34} />

        {/* Remaining cards */}
        <span className="absolute -right-3 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-sindoor px-1 text-xs font-extrabold text-white">
          {seat.cardCount ?? 0}
        </span>
      </div>

      {/* Player name */}
      <p className="w-full truncate text-xs font-bold leading-4 text-dhaka">
        {seat.name}
      </p>

      {/* Player status */}
      <div className="flex min-h-[18px] items-center justify-center">
        {!seat.connected ? (
          <span className="text-[10px] font-bold uppercase text-ink/60">
            Offline
          </span>
        ) : called ? (
          <span className="rounded-full bg-marigold px-2 py-0.5 text-[10px] font-extrabold text-ink">
            UNO!
          </span>
        ) : vulnerable ? (
          <button
            type="button"
            onClick={onCatch}
            className="rounded-full bg-sindoor px-2 py-0.5 text-[10px] font-extrabold text-white transition-transform active:scale-95"
          >
            Catch!
          </button>
        ) : null}
      </div>
    </div>
  );
}
