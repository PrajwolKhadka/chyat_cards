import type { Card, Color } from "./types";

export const CARD_HEX: Record<Color, string> = {
  red: "#c8102e",
  yellow: "#f4b400",
  green: "#2e7d32",
  blue: "#1565c0",
};

export const COLOR_LABEL: Record<Color, { ne: string; en: string }> = {
  red: { ne: "रातो", en: "Red" },
  yellow: { ne: "पहेँलो", en: "Yellow" },
  green: { ne: "हरियो", en: "Green" },
  blue: { ne: "निलो", en: "Blue" },
};

const DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toDevanagari(n: number): string {
  return String(n).replace(/\d/g, (d) => DIGITS[Number(d)]);
}

// Your PNG files go in public/cards with these exact names
export function cardImageSrc(card: Card | null): string {
  if (!card) return "/cards/back.png";
  if (card.kind === "wild") return card.value === "draw4" ? "/cards/wild_draw4.png" : "/cards/wild.png";
  return `/cards/${card.color}_${card.value}.png`;
}

export function cardSymbol(card: Card): string {
  if (card.kind === "number") return toDevanagari(card.value);
  if (card.kind === "action") {
    if (card.value === "skip") return "⊘";
    if (card.value === "reverse") return "⇄";
    return "+२";
  }
  return card.value === "draw4" ? "+४" : "✦";
}

export function cardAria(card: Card | null): string {
  if (!card) return "Card back";
  if (card.kind === "wild") return card.value === "draw4" ? "Wild draw four" : "Wild card";
  const color = COLOR_LABEL[card.color].en;
  if (card.kind === "number") return `${color} ${card.value}`;
  const names = { skip: "skip", reverse: "reverse", draw2: "draw two" } as const;
  return `${color} ${names[card.value]}`;
}
