import { ACTIONS, COLORS, type Card } from "./card";

export type Rng = (maxExclusive: number) => number;

export function buildDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    deck.push({ id: `${color}_0_a`, kind: "number", color, value: 0 });

    for (let n = 1; n <= 9; n++) {
      for (const copy of ["a", "b"]) {
        deck.push({ id: `${color}_${n}_${copy}`, kind: "number", color, value: n });
      }
    }

    for (const action of ACTIONS) {
      for (const copy of ["a", "b"]) {
        deck.push({ id: `${color}_${action}_${copy}`, kind: "action", color, value: action });
      }
    }
  }

  for (let i = 1; i <= 4; i++) {
    deck.push({ id: `wild_${i}`, kind: "wild", value: "wild" });
    deck.push({ id: `draw4_${i}`, kind: "wild", value: "draw4" });
  }

  return deck;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}