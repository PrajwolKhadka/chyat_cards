import type { GameView, RoomView } from "@/lib/types";
import { card, primary } from "@/components/ui/styles";

type Props = {
  room: RoomView;
  game: GameView;
  onLeave: () => void;
};

export default function WinnerOverlay({ room, game, onLeave }: Props) {
  const winner = room.seats.find((s) => s.playerId === game.winnerId);
  const iWon = game.winnerId === room.you;
  const ranking = [...room.seats].sort((a, b) => (a.cardCount ?? 99) - (b.cardCount ?? 99));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
      <div className={`${card} w-full max-w-sm space-y-4 text-center`}>
        <p className="text-6xl">{iWon ? "🎉" : "🏁"}</p>
        <h2 className="font-display text-3xl text-sindoor">{iWon ? "You won!" : `${winner?.name ?? "Someone"} won`}</h2>
        <p className="text-sm text-ink/60">{iWon ? "Wah! Well played" : "Better luck next round"}</p>

        <ul className="space-y-1 text-left">
          {ranking.map((s) => (
            <li key={s.playerId} className="flex justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-ink/10">
              <span className="truncate font-bold">{s.name}</span>
              <span className="text-ink/60">{s.cardCount ?? 0} cards left</span>
            </li>
          ))}
        </ul>

        <button className={primary} onClick={onLeave}>
          Back to home
        </button>
      </div>
    </div>
  );
}
