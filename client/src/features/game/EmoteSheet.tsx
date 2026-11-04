"use client";

import Sheet from "@/components/ui/Sheet";
import { EMOTE_INFO } from "@/lib/emotes";
import { EMOTES, type EmoteId } from "@/lib/types";

type Props = {
  open: boolean;
  onPick: (emote: EmoteId) => void;
  onClose: () => void;
};

export default function EmoteSheet({ open, onPick, onClose }: Props) {
  return (
    <Sheet open={open} title="Taunt them" onClose={onClose}>
      <div className="grid grid-cols-5 gap-2">
        {EMOTES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow ring-1 ring-ink/10 active:scale-90"
          >
            <span className="text-3xl">{EMOTE_INFO[id].emoji}</span>
            <span className="text-[10px] font-semibold leading-tight">{EMOTE_INFO[id].text}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
