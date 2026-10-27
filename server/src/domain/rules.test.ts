import { describe, expect, it } from "vitest";
import type { Card, Color } from "./card";
import { advanceTurn, isPlayable } from "./rules";

const num = (color: Color, value: number): Card => ({
  id: `${color}_${value}_t`,
  kind: "number",
  color,
  value,
});

const skip = (color: Color): Card => ({
  id: `${color}_skip_t`,
  kind: "action",
  color,
  value: "skip",
});

const reverse = (color: Color): Card => ({
  id: `${color}_reverse_t`,
  kind: "action",
  color,
  value: "reverse",
});

const draw2 = (color: Color): Card => ({
  id: `${color}_draw2_t`,
  kind: "action",
  color,
  value: "draw2",
});

const wild: Card = { id: "wild_t", kind: "wild", value: "wild" };

describe("isPlayable", () => {
  const ctx = { topCard: num("red", 5), currentColor: "red" as Color };

  it("allows the same color", () => {
    expect(isPlayable(num("red", 9), ctx)).toBe(true);
  });

  it("allows the same number in another color", () => {
    expect(isPlayable(num("blue", 5), ctx)).toBe(true);
  });

  it("rejects a different color and number", () => {
    expect(isPlayable(num("blue", 7), ctx)).toBe(false);
  });

  it("allows the same action symbol in another color", () => {
    const c = { topCard: skip("red"), currentColor: "red" as Color };
    expect(isPlayable(skip("green"), c)).toBe(true);
    expect(isPlayable(reverse("green"), c)).toBe(false);
  });

  it("always allows a wild", () => {
    expect(isPlayable(wild, ctx)).toBe(true);
  });

  it("after a wild only the chosen color matches", () => {
    const c = { topCard: wild, currentColor: "green" as Color };
    expect(isPlayable(num("green", 3), c)).toBe(true);
    expect(isPlayable(num("red", 3), c)).toBe(false);
  });
});

describe("advanceTurn", () => {
  it("moves to the next player", () => {
    const r = advanceTurn(num("red", 1), { current: 0, direction: 1, playerCount: 4 });
    expect(r.next).toBe(1);
  });

  it("wraps around the table", () => {
    const r = advanceTurn(num("red", 1), { current: 3, direction: 1, playerCount: 4 });
    expect(r.next).toBe(0);
  });

  it("goes backward and wraps below zero", () => {
    const r = advanceTurn(num("red", 1), { current: 0, direction: -1, playerCount: 4 });
    expect(r.next).toBe(3);
  });

  it("skip jumps over one player", () => {
    const r = advanceTurn(skip("red"), { current: 0, direction: 1, playerCount: 4 });
    expect(r.next).toBe(2);
  });

  it("reverse flips direction", () => {
    const r = advanceTurn(reverse("red"), { current: 1, direction: 1, playerCount: 4 });
    expect(r.direction).toBe(-1);
    expect(r.next).toBe(0);
  });

  it("reverse with 2 players gives the same player another turn", () => {
    const r = advanceTurn(reverse("red"), { current: 0, direction: 1, playerCount: 2 });
    expect(r.next).toBe(0);
  });

  it("draw two makes the next player draw and lose their turn", () => {
    const r = advanceTurn(draw2("red"), { current: 0, direction: 1, playerCount: 4 });
    expect(r.drawVictim).toBe(1);
    expect(r.drawCount).toBe(2);
    expect(r.next).toBe(2);
  });
});