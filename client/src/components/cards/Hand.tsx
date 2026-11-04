
"use client";

import { useMemo } from "react";
import { cardAria } from "@/lib/cardAssets";
import type { Card as CardType, Color } from "@/lib/types";
import Card from "./Card";

const COLOR_ORDER: Record<Color, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
};

const ACTION_ORDER = {
  skip: 0,
  reverse: 1,
  draw2: 2,
} as const;

function rank(card: CardType): number {
  if (card.kind === "wild") {
    return 1000 + (card.value === "draw4" ? 1 : 0);
  }

  const base = COLOR_ORDER[card.color] * 100;

  if (card.kind === "number") {
    return base + card.value;
  }

  return base + 20 + ACTION_ORDER[card.value];
}

type Props = {
  cards: CardType[];
  playableIds: string[];
  onPlay: (card: CardType) => void;
};

export default function Hand({
  cards,
  playableIds,
  onPlay,
}: Props) {
  const sorted = useMemo(
    () => [...cards].sort((a, b) => rank(a) - rank(b)),
    [cards],
  );

  const playable = useMemo(
    () => new Set(playableIds),
    [playableIds],
  );

  // Keep small hands readable and overlap larger hands.
  const gap =
    sorted.length <= 5
      ? 4
      : sorted.length <= 8
        ? -18
        : -29;

  return (
    <div className="no-scrollbar min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x px-3 pb-2 pt-5">

      <div className="mx-auto flex w-max">

        {sorted.map((card, i) => {
          const ok = playable.has(card.id);

          return (
            <button
              key={card.id}
              type="button"
              disabled={!ok}
              aria-label={cardAria(card)}
              onClick={() => onPlay(card)}
              style={{
                marginLeft: i === 0 ? 0 : gap,
              }}
              className={`shrink-0 transition-transform duration-150 ${
                ok
                  ? "-translate-y-3 active:-translate-y-5"
                  : "brightness-75"
              }`}
            >
              <Card card={card} width={68} />
            </button>
          );
        })}

      </div>
    </div>
  );
}
