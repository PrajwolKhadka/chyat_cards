import type { Card, Color } from "../../domain/card";
import type { Room, RoomStatus } from "../../domain/room";
import { isPlayable, type Direction } from "../../domain/rules";

export type SeatView = {
  playerId: string;
  name: string;
  isGuest: boolean;
  isHost: boolean;
  connected: boolean;
  cardCount: number | null;
};

export type GameView = {
  status: "playing" | "finished";
  topCard: Card;
  currentColor: Color;
  currentPlayerId: string;
  direction: Direction;
  drawPileCount: number;
  hand: Card[];
  playableIds: string[];
  drawnCardId: string | null;
  canRespondDraw4: boolean;
  pendingDraw4: { playedBy: string; victimId: string } | null;
  unoVulnerable: string | null;
  unoCalled: string[];
  winnerId: string | null;
  turnEndsAt: number | null;
};

export type RoomView = {
  code: string;
  status: RoomStatus;
  hostId: string;
  you: string;
  seats: SeatView[];
  game: GameView | null;
};

export function viewFor(room: Room, playerId: string, turnEndsAt: number | null): RoomView {
  const game = room.game;
  const counts = new Map<string, number>(
    game ? game.players.map((p): [string, number] => [p.id, p.hand.length]) : [],
  );

  const seats: SeatView[] = room.seats.map((s) => ({
    playerId: s.playerId,
    name: s.name,
    isGuest: s.isGuest,
    isHost: s.playerId === room.hostId,
    connected: s.connected,
    cardCount: counts.get(s.playerId) ?? null,
  }));

  let gameView: GameView | null = null;

  if (game) {
    const hand = game.players.find((p) => p.id === playerId)?.hand ?? [];
    const top = game.discardPile[game.discardPile.length - 1];
    const currentPlayerId = game.players[game.current].id;
    const pending = game.pendingDraw4;
    const myTurn = game.status === "playing" && currentPlayerId === playerId && !pending;

    const playableIds = myTurn
      ? hand
          .filter(
            (c) =>
              (game.drawnCardId === null || c.id === game.drawnCardId) &&
              isPlayable(c, { topCard: top, currentColor: game.currentColor }),
          )
          .map((c) => c.id)
      : [];

    gameView = {
      status: game.status,
      topCard: top,
      currentColor: game.currentColor,
      currentPlayerId,
      direction: game.direction,
      drawPileCount: game.drawPile.length,
      hand,
      playableIds,
      drawnCardId: myTurn ? game.drawnCardId : null,
      canRespondDraw4: !!pending && pending.victimId === playerId && currentPlayerId === playerId,
      pendingDraw4: pending ? { playedBy: pending.playedBy, victimId: pending.victimId } : null,
      unoVulnerable: game.unoVulnerable,
      unoCalled: game.unoCalled,
      winnerId: game.winnerId,
      turnEndsAt: game.status === "playing" ? turnEndsAt : null,
    };
  }

  return { code: room.code, status: room.status, hostId: room.hostId, you: playerId, seats, game: gameView };
}