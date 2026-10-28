import { describe, expect, it } from "vitest";
import type { Card, Color } from "./card";
import { GameError, acceptDraw4, callUno, catchUno, challengeDraw4, drawCard, passTurn, playCard, startGame, type GameState } from "./game";

const rng = (max: number) => Math.floor(Math.random() * max);

const num = (color: Color, value: number): Card => ({
  id: `${color}_${value}_t`,
  kind: "number",
  color,
  value,
});
const draw2: Card = { id: "red_draw2_t", kind: "action", color: "red", value: "draw2" };
const wild: Card = { id: "wild_t", kind: "wild", value: "wild" };

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    status: "playing",
    players: [
      { id: "a", name: "A", hand: [num("red", 3), num("blue", 7)] },
      { id: "b", name: "B", hand: [num("green", 1)] },
      { id: "c", name: "C", hand: [num("yellow", 2)] },
    ],
    drawPile: [num("green", 4), num("green", 5), num("green", 6)],
    discardPile: [num("red", 5)],
    currentColor: "red",
    current: 0,
    direction: 1,
    drawnCardId: null,
    winnerId: null,
    unoCalled: [],
    unoVulnerable: null,
    pendingDraw4: null,
    ...overrides,
  };
}

describe("startGame", () => {
  it("deals 7 cards to each player", () => {
    const s = startGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], rng);
    expect(s.players.every((p) => p.hand.length === 7)).toBe(true);
    expect(s.drawPile).toHaveLength(108 - 14 - 1);
    expect(s.discardPile[0].kind).toBe("number");
  });

  it("works with 10 players", () => {
    const seats = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const s = startGame(seats, rng);
    expect(s.drawPile).toHaveLength(108 - 70 - 1);
  });

  it("rejects too few or too many players", () => {
    expect(() => startGame([{ id: "a", name: "A" }], rng)).toThrow(GameError);
    const eleven = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(() => startGame(eleven, rng)).toThrow(GameError);
  });
});

describe("playCard", () => {
  it("plays a matching card and moves the turn", () => {
    const s = playCard(makeState(), "a", "red_3_t", rng);
    expect(s.players[0].hand).toHaveLength(1);
    expect(s.discardPile.at(-1)?.id).toBe("red_3_t");
    expect(s.current).toBe(1);
  });

  it("rejects a move out of turn", () => {
    expect(() => playCard(makeState(), "b", "green_1_t", rng)).toThrow("Not your turn");
  });

  it("rejects a card the player does not hold", () => {
    expect(() => playCard(makeState(), "a", "green_1_t", rng)).toThrow("do not have");
  });

  it("rejects a card that does not match", () => {
    expect(() => playCard(makeState(), "a", "blue_7_t", rng)).toThrow("cannot be played");
  });

  it("requires a color for a wild and applies it", () => {
    const state = makeState({
      players: [
        { id: "a", name: "A", hand: [wild, num("blue", 7)] },
        { id: "b", name: "B", hand: [num("green", 1)] },
      ],
    });
    expect(() => playCard(state, "a", "wild_t", rng)).toThrow("Choose a color");
    const next = playCard(state, "a", "wild_t", rng, "green");
    expect(next.currentColor).toBe("green");
  });

  it("ends the game when the last card is played", () => {
    const state = makeState({
      players: [
        { id: "a", name: "A", hand: [num("red", 3)] },
        { id: "b", name: "B", hand: [num("green", 1)] },
      ],
    });
    const next = playCard(state, "a", "red_3_t", rng);
    expect(next.status).toBe("finished");
    expect(next.winnerId).toBe("a");
    expect(() => playCard(next, "b", "green_1_t", rng)).toThrow("game is over");
  });

  it("draw two makes the next player draw and skips them", () => {
    const state = makeState({
      players: [
        { id: "a", name: "A", hand: [draw2, num("blue", 7)] },
        { id: "b", name: "B", hand: [num("green", 1)] },
        { id: "c", name: "C", hand: [num("yellow", 2)] },
      ],
    });
    const next = playCard(state, "a", "red_draw2_t", rng);
    expect(next.players[1].hand).toHaveLength(3);
    expect(next.current).toBe(2);
  });
});

describe("drawCard and passTurn", () => {
  it("passes the turn automatically when the drawn card is unplayable", () => {
    const next = drawCard(makeState(), "a", rng); // draws green 6 on red
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.current).toBe(1);
    expect(next.drawnCardId).toBeNull();
  });

  it("keeps the turn open when the drawn card is playable", () => {
    const state = makeState({ drawPile: [num("green", 4), num("red", 8)] });
    const next = drawCard(state, "a", rng);
    expect(next.current).toBe(0);
    expect(next.drawnCardId).toBe("red_8_t");
    // only the drawn card may be played now
    expect(() => playCard(next, "a", "red_3_t", rng)).toThrow("just drew");
    expect(playCard(next, "a", "red_8_t", rng).current).toBe(1);
  });

  it("lets the player pass after drawing a playable card", () => {
    const state = makeState({ drawPile: [num("green", 4), num("red", 8)] });
    const afterDraw = drawCard(state, "a", rng);
    expect(passTurn(afterDraw, "a").current).toBe(1);
  });

  it("does not allow passing without drawing", () => {
    expect(() => passTurn(makeState(), "a")).toThrow("Draw a card");
  });

  it("reshuffles the discard pile when the draw pile is empty", () => {
    const state = makeState({
      drawPile: [],
      discardPile: [num("red", 1), num("red", 2), num("red", 5)],
    });
    const next = drawCard(state, "a", rng);
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.discardPile).toHaveLength(1);
    expect(next.discardPile[0].id).toBe("red_5_t");
    expect(next.drawPile).toHaveLength(1);
  });
});

describe("UNO call", () => {
  it("makes a player catchable when they drop to one card without calling", () => {
    const s = playCard(makeState(), "a", "red_3_t", rng);
    expect(s.unoVulnerable).toBe("a");

    const caught = catchUno(s, "b", "a", rng);
    expect(caught.players[0].hand).toHaveLength(3);
    expect(caught.unoVulnerable).toBeNull();
  });

  it("protects a player who called UNO first", () => {
    const called = callUno(makeState(), "a");
    const s = playCard(called, "a", "red_3_t", rng);
    expect(s.unoVulnerable).toBeNull();
    expect(() => catchUno(s, "b", "a", rng)).toThrow("Too late");
  });

  it("closes the catch window when the next player acts", () => {
    const s = playCard(makeState(), "a", "red_3_t", rng);
    const after = drawCard(s, "b", rng);
    expect(() => catchUno(after, "c", "a", rng)).toThrow("Too late");
  });

  it("does not let a player catch themselves", () => {
    const s = playCard(makeState(), "a", "red_3_t", rng);
    expect(() => catchUno(s, "a", "a", rng)).toThrow("yourself");
  });

  it("rejects a UNO call with 3 cards or more", () => {
    const state = makeState({
      players: [
        { id: "a", name: "A", hand: [num("red", 3), num("blue", 7), num("blue", 8)] },
        { id: "b", name: "B", hand: [num("green", 1)] },
      ],
    });
    expect(() => callUno(state, "a")).toThrow("2 cards or fewer");
  });
});

describe("wild draw four", () => {
  const draw4: Card = { id: "draw4_t", kind: "wild", value: "draw4" };
  const pile = () => Array.from({ length: 8 }, (_, i) => num("yellow", 10 + i));

  const setup = (aHand: Card[]) =>
    makeState({
      players: [
        { id: "a", name: "A", hand: aHand },
        { id: "b", name: "B", hand: [num("green", 1)] },
        { id: "c", name: "C", hand: [num("yellow", 2)] },
      ],
      drawPile: pile(),
    });

  it("waits for the next player to respond", () => {
    const s = playCard(setup([draw4, num("blue", 7)]), "a", "draw4_t", rng, "green");
    expect(s.pendingDraw4).not.toBeNull();
    expect(s.current).toBe(1);
    expect(() => drawCard(s, "b", rng)).toThrow("Respond to the wild draw four");
  });

  it("accepting makes the victim draw 4 and lose the turn", () => {
    const s = playCard(setup([draw4, num("blue", 7)]), "a", "draw4_t", rng, "green");
    const next = acceptDraw4(s, "b", rng);
    expect(next.players[1].hand).toHaveLength(5);
    expect(next.current).toBe(2);
    expect(next.pendingDraw4).toBeNull();
  });

  it("only the victim can respond", () => {
    const s = playCard(setup([draw4, num("blue", 7)]), "a", "draw4_t", rng, "green");
    expect(() => acceptDraw4(s, "c", rng)).toThrow("Not your turn");
  });

  it("a successful challenge makes the bluffer draw 4", () => {
    // player a holds a red card while red is active, so the play was illegal
    const s = playCard(setup([draw4, num("red", 3), num("blue", 7)]), "a", "draw4_t", rng, "green");
    const next = challengeDraw4(s, "b", rng);
    expect(next.players[0].hand).toHaveLength(6);
    expect(next.players[1].hand).toHaveLength(1);
    expect(next.current).toBe(1);
  });

  it("a failed challenge makes the challenger draw 6 and lose the turn", () => {
    const s = playCard(setup([draw4, num("blue", 7), num("blue", 8)]), "a", "draw4_t", rng, "green");
    const next = challengeDraw4(s, "b", rng);
    expect(next.players[1].hand).toHaveLength(7);
    expect(next.current).toBe(2);
  });

  it("ends the game immediately when it is the last card", () => {
    const s = playCard(setup([draw4]), "a", "draw4_t", rng, "green");
    expect(s.status).toBe("finished");
    expect(s.pendingDraw4).toBeNull();
    expect(s.players[1].hand).toHaveLength(5);
  });
});