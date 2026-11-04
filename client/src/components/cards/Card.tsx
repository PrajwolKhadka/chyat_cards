"use client";

import { useState } from "react";
import { CARD_HEX, cardAria, cardImageSrc, cardSymbol } from "@/lib/cardAssets";
import type { Card as CardType } from "@/lib/types";

type Props = {
  card: CardType | null;
  width?: number;
  className?: string;
};

function faceBackground(card: CardType | null): string {
  if (!card) {
    return "repeating-linear-gradient(45deg, #7a1630 0 7px, #5a0f1e 7px 14px)";
  }

  if (card.kind === "wild") {
    return "conic-gradient(#c8102e 0 25%, #f4b400 0 50%, #2e7d32 0 75%, #1565c0 0)";
  }

  return CARD_HEX[card.color];
}

export default function Card({ card, width = 76, className = "" }: Props) {
  const src = cardImageSrc(card);

  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const height = Math.round(width * 1.4);
  const radius = Math.round(width * 0.12);

  if (failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={cardAria(card)}
        width={width}
        height={height}
        draggable={false}
        onError={() => setFailedSrc(src)}
        style={{
          display: "block",
          width,
          height,
          minWidth: width,
          flexShrink: 0,
          borderRadius: radius,
        }}
        className={`select-none object-cover drop-shadow-md ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={cardAria(card)}
      style={{
        display: "flex",
        width,
        height,
        minWidth: width,
        flexShrink: 0,
        borderRadius: radius,
        background: faceBackground(card),
        fontSize: card ? width * 0.46 : width * 0.3,
      }}
      className={`items-center justify-center border-[3px] border-white font-extrabold text-white shadow-md ${className}`}
    >
      {card ? (
        <span
          className={
            card.kind === "wild"
              ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              : ""
          }
        >
          {cardSymbol(card)}
        </span>
      ) : (
        <span className="font-display">उनो</span>
      )}
    </div>
  );
}
