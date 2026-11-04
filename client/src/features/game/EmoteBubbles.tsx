import { EMOTE_INFO } from "@/lib/emotes";
import type { EmoteBubble } from "@/features/room/RoomProvider";

export default function EmoteBubbles({ bubbles }: { bubbles: EmoteBubble[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-30 flex flex-col items-center gap-2">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="emote-pop flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-lg ring-1 ring-ink/10"
        >
          <span className="text-2xl">{EMOTE_INFO[b.emote].emoji}</span>
          <span className="text-sm font-extrabold">{b.name}</span>
          <span className="text-xs font-semibold text-dhaka">{EMOTE_INFO[b.emote].text}</span>
        </div>
      ))}
    </div>
  );
}
