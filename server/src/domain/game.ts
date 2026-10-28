import type { Card, Color } from "./card";
import { buildDeck, shuffle, type Rng } from "./deck";
import { advanceTurn, isPlayable, nextIndex, type Direction } from "./rules";

export class GameError extends Error {}

export type Player = {
  id: string;
  name: string;
  hand: Card[];
};
export type PendingDraw4 = {
  playedBy: string;
  victimId: string;
  hadMatchingColor: boolean;
  resumeIndex: number;
};

export type GameState = {
  status: "playing" | "finished";
  players: Player[];
  drawPile: Card[]; // cards are taken from the end
  discardPile: Card[]; // the last element is the top card
  currentColor: Color;
  current: number; // index of the player whose turn it is
  direction: Direction;
  drawnCardId: string | null; // set when the current player drew a playable card
  winnerId: string | null;
  unoCalled: string[];
  unoVulnerable: string | null;
  pendingDraw4: PendingDraw4 | null;
};

export function startGame(
  seats: { id: string; name: string }[],
  rng: Rng,
): GameState {
  if (seats.length < 2 || seats.length > 10) {
    throw new GameError("A game needs 2 to 10 players");
  }

  const deck = shuffle(buildDeck(), rng);
  const players: Player[] = seats.map((s) => ({
    id: s.id,
    name: s.name,
    hand: [],
  }));

  for (let round = 0; round < 7; round++) {
    for (const p of players) {
      p.hand.push(deck.pop()!);
    }
  }

  // The first discard is always a number card, which keeps the opening simple
  const starterIndex = deck.findIndex((c) => c.kind === "number");
  const starter =
    starterIndex >= 0 ? deck.splice(starterIndex, 1)[0] : undefined;
  if (!starter || starter.kind !== "number") {
    throw new GameError("Could not pick a starting card");
  }

  return {
    status: "playing",
    players,
    drawPile: deck,
    discardPile: [starter],
    currentColor: starter.color,
    current: 0,
    direction: 1,
    drawnCardId: null,
    winnerId: null,
    unoCalled: [],
    unoVulnerable: null,
    pendingDraw4: null,
  };
}

// Takes cards from the draw pile. If it runs empty, the discard pile
// (except its top card) is reshuffled into a new draw pile.
function takeCards(state: GameState, count: number, rng: Rng) {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const cards: Card[] = [];

  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length <= 1) break; // nothing left anywhere
      const top = discardPile[discardPile.length - 1];
      drawPile = shuffle(discardPile.slice(0, -1), rng);
      discardPile = [top];
    }
    cards.push(drawPile.pop()!);
  }

  return { cards, drawPile, discardPile };
}

function assertTurn(state: GameState, playerId: string) {
  if (state.status !== "playing") throw new GameError("The game is over");
  if (state.players[state.current].id !== playerId)
    throw new GameError("Not your turn");
}

function giveCards(
  players: Player[],
  playerId: string,
  cards: Card[],
): Player[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, hand: [...p.hand, ...cards] } : p,
  );
}

// Anyone who now holds more than 2 cards is no longer covered by an earlier UNO call
function tidyUno(unoCalled: string[], players: Player[]): string[] {
  return unoCalled.filter(
    (id) => (players.find((p) => p.id === id)?.hand.length ?? 99) <= 2,
  );
}

function assertNoPending(state: GameState) {
  if (state.pendingDraw4)
    throw new GameError("Respond to the wild draw four first");
}
export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  rng: Rng,
  chosenColor?: Color,
): GameState {
  assertTurn(state, playerId);
  assertNoPending(state);

  const idx = state.current;
  const player = state.players[idx];
  const card = player.hand.find((c) => c.id === cardId);

  if (!card) throw new GameError("You do not have that card");
  if (state.drawnCardId && state.drawnCardId !== cardId) {
    throw new GameError("You can only play the card you just drew");
  }

  const top = state.discardPile[state.discardPile.length - 1];
  if (!isPlayable(card, { topCard: top, currentColor: state.currentColor })) {
    throw new GameError("That card cannot be played");
  }
  if (card.kind === "wild" && !chosenColor) {
    throw new GameError("Choose a color for the wild card");
  }

  const hand = player.hand.filter((c) => c.id !== cardId);
  const won = hand.length === 0;
  const turn = advanceTurn(card, {
    current: idx,
    direction: state.direction,
    playerCount: state.players.length,
  });

  const isDraw4 = card.kind === "wild" && card.value === "draw4";
  const hadMatchingColor = player.hand.some(
    (c) => c.kind !== "wild" && c.color === state.currentColor,
  );

  let drawPile = state.drawPile;
  let discardPile = [...state.discardPile, card];
  let players = state.players.map((p, i) => (i === idx ? { ...p, hand } : p));
  let pendingDraw4: PendingDraw4 | null = null;
  let next = turn.next;

  if (turn.drawVictim !== undefined && turn.drawCount) {
    const victimId = state.players[turn.drawVictim].id;

    if (isDraw4 && !won) {
      // The victim must now accept the cards or challenge the play
      pendingDraw4 = { playedBy: player.id, victimId, hadMatchingColor, resumeIndex: turn.next };
      next = turn.drawVictim;
    } else {
      const taken = takeCards({ ...state, drawPile, discardPile }, turn.drawCount, rng);
      drawPile = taken.drawPile;
      discardPile = taken.discardPile;
      players = giveCards(players, victimId, taken.cards);
    }
  }

  return {
    ...state,
    players,
    drawPile,
    discardPile,
    currentColor: card.kind === "wild" ? chosenColor! : card.color,
    current: next,
    direction: turn.direction,
    drawnCardId: null,
    status: won ? "finished" : "playing",
    winnerId: won ? player.id : null,
    unoCalled: tidyUno(state.unoCalled, players),
    unoVulnerable: hand.length === 1 && !state.unoCalled.includes(player.id) ? player.id : null,
    pendingDraw4,
  };
}

export function drawCard(state: GameState, playerId: string, rng: Rng): GameState {
  assertTurn(state, playerId);
  assertNoPending(state);
  if (state.drawnCardId) throw new GameError("You already drew a card this turn");

  const taken = takeCards(state, 1, rng);
  const card = taken.cards[0];
  const players = card ? giveCards(state.players, playerId, [card]) : state.players;

  const base = {
    ...state,
    players,
    drawPile: taken.drawPile,
    discardPile: taken.discardPile,
    unoCalled: tidyUno(state.unoCalled, players),
    unoVulnerable: null, // the next player acted, so the UNO catch window is closed
  };

  const top = taken.discardPile[taken.discardPile.length - 1];
  const playable = card && isPlayable(card, { topCard: top, currentColor: state.currentColor });

  if (playable) return { ...base, drawnCardId: card.id };

  return {
    ...base,
    current: nextIndex(state.current, state.direction, state.players.length),
    drawnCardId: null,
  };
}

export function passTurn(state: GameState, playerId: string): GameState {
  assertTurn(state, playerId);
  if (!state.drawnCardId) throw new GameError("Draw a card before passing");

  return {
    ...state,
    current: nextIndex(state.current, state.direction, state.players.length),
    drawnCardId: null,
  };
}

export function callUno(state: GameState, playerId: string): GameState {
  if (state.status !== "playing") throw new GameError("The game is over");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("You are not in this game");
  if (player.hand.length > 2) throw new GameError("You can only call CHYAT with 2 cards or fewer");

  return {
    ...state,
    unoCalled: state.unoCalled.includes(playerId) ? state.unoCalled : [...state.unoCalled, playerId],
    unoVulnerable: state.unoVulnerable === playerId ? null : state.unoVulnerable,
  };
}

export function catchUno(
  state: GameState,
  catcherId: string,
  targetId: string,
  rng: Rng,
): GameState {
  if (state.status !== "playing") throw new GameError("The game is over");
  if (!state.players.some((p) => p.id === catcherId)) throw new GameError("You are not in this game");
  if (catcherId === targetId) throw new GameError("You cannot catch yourself");
  if (state.unoVulnerable !== targetId) throw new GameError("Too late, or they already called CHYAT");

  const taken = takeCards(state, 2, rng);
  const players = giveCards(state.players, targetId, taken.cards);

  return {
    ...state,
    players,
    drawPile: taken.drawPile,
    discardPile: taken.discardPile,
    unoCalled: tidyUno(state.unoCalled, players),
    unoVulnerable: null,
  };
}

function pendingFor(state: GameState, playerId: string): PendingDraw4 {
  assertTurn(state, playerId);
  if (!state.pendingDraw4) throw new GameError("There is no wild draw four to respond to");
  return state.pendingDraw4;
}

export function acceptDraw4(state: GameState, playerId: string, rng: Rng): GameState {
  const pending = pendingFor(state, playerId);
  const taken = takeCards(state, 4, rng);
  const players = giveCards(state.players, pending.victimId, taken.cards);

  return {
    ...state,
    players,
    drawPile: taken.drawPile,
    discardPile: taken.discardPile,
    current: pending.resumeIndex,
    pendingDraw4: null,
    unoCalled: tidyUno(state.unoCalled, players),
  };
}

export function challengeDraw4(state: GameState, playerId: string, rng: Rng): GameState {
  const pending = pendingFor(state, playerId);
  const guilty = pending.hadMatchingColor;

  // Guilty: the player who played it draws 4 and the challenger plays normally.
  // Wrong challenge: the challenger draws 6 and loses their turn.
  const taken = takeCards(state, guilty ? 4 : 6, rng);
  const players = giveCards(state.players, guilty ? pending.playedBy : pending.victimId, taken.cards);

  return {
    ...state,
    players,
    drawPile: taken.drawPile,
    discardPile: taken.discardPile,
    current: guilty ? state.current : pending.resumeIndex,
    pendingDraw4: null,
    unoCalled: tidyUno(state.unoCalled, players),
  };
}