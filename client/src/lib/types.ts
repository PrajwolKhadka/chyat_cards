export const COLORS = ["red", "yellow", "green", "blue"] as const;
export type Color = (typeof COLORS)[number];

export type ActionValue = "skip" | "reverse" | "draw2";
export type WildValue = "wild" | "draw4";

export type Card =
  | { id: string; kind: "number"; color: Color; value: number }
  | { id: string; kind: "action"; color: Color; value: ActionValue }
  | { id: string; kind: "wild"; value: WildValue };

export const EMOTES = [
  "laugh",
  "cry",
  "angry",
  "clap",
  "fire",
  "skull",
  "sleepy",
  "thumbsdown",
  "namaste",
  "momo",
] as const;
export type EmoteId = (typeof EMOTES)[number];

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
  direction: 1 | -1;
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
  status: "lobby" | "playing" | "finished";
  hostId: string;
  you: string;
  seats: SeatView[];
  game: GameView | null;
};
