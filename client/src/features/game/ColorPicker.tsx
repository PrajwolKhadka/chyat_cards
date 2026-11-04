"use client";

import Sheet from "@/components/ui/Sheet";
import { CARD_HEX, COLOR_LABEL } from "@/lib/cardAssets";
import { COLORS, type Color } from "@/lib/types";

type Props = {
  open: boolean;
  onPick: (color: Color) => void;
  onClose: () => void;
};

export default function ColorPicker({ open, onPick, onClose }: Props) {
  return (
    <Sheet open={open} title="Choose a color" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onPick(color)}
            style={{ backgroundColor: CARD_HEX[color] }}
            className={`flex h-24 flex-col items-center justify-center rounded-2xl font-extrabold shadow active:scale-95 ${
              color === "yellow" ? "text-ink" : "text-white"
            }`}
          >
            <span className="font-display text-3xl">{COLOR_LABEL[color].ne}</span>
            <span className="text-sm">{COLOR_LABEL[color].en}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
