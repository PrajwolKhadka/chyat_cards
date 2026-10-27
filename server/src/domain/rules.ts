import type { Card, Color } from "./card";
export type Direction = 1 | -1;

export type PlayContext = {
  topCard: Card;
  currentColor: Color;
};

export function isPlayable(card: Card, ctx: PlayContext): boolean {
  if (card.kind === "wild") return true;
  if (card.color === ctx.currentColor) return true;

  const top = ctx.topCard;

  if (card.kind === "number" && top.kind === "number") {
    return card.value === top.value;
  }

  if (card.kind === "action" && top.kind === "action") {
    return card.value === top.value;
  }

  return false;
}

export type Effect =
  | { type: "none" }
  | { type: "skip" }
  | { type: "reverse" }
  | { type: "draw"; count: 2 | 4 };

export function effectOf(card: Card): Effect {
  if (card.kind === "number") return { type: "none" };
  if (card.kind === "wild") {
    return card.value === "draw4"
      ? { type: "draw", count: 4 }
      : { type: "none" };
  }
  switch (card.value) {
    case "skip":
      return { type: "skip" };
    case "reverse":
      return { type: "reverse" };
    case "draw2":
      return { type: "draw", count: 2 };
  }
}

export function nextIndex(
  current: number,
  direction: Direction,
  playerCount: number,
  steps = 1,
): number {
  return (current + direction * steps + playerCount) % playerCount;
}

export type TurnState = {
  current: number;
  direction: Direction;
  playerCount: number;
};

export type TurnResult = {
  direction: Direction;
  next: number;
  drawVictim?: number;
  drawCount?: number;
};

export function advanceTurn(card: Card, t: TurnState): TurnResult {
  const effect = effectOf(card);
  const { current, playerCount } = t;
  let direction = t.direction;

  switch (effect.type) {
    case "none":
      return { direction, next: nextIndex(current, direction, playerCount) };
    case "skip":
      return { direction, next: nextIndex(current, direction, playerCount, 2) };
    case "reverse":
      direction = direction === 1 ? -1 : 1;
      //with 2 players, reverse is the same as skip
      const next =
        playerCount === 2
          ? current
          : nextIndex(current, direction, playerCount);
      return { direction, next };
    case "draw": {
      const victim = nextIndex(current, direction, playerCount);
      return {
        direction,
        next: nextIndex(current, direction, playerCount, 2),
        drawVictim: victim,
        drawCount: effect.count,
      };
    }
  }
}
