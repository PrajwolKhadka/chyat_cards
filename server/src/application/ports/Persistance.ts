import { GoogleProfile } from "./auth";

export type User = {
  id: string;
  googleId: string;
  name: string;
  picture?: string;
};

export interface UserRepository {
  upsertGoogle(profile: GoogleProfile): Promise<User>;
}

export type MatchRecord = {
  roomCode: string;
  finishedAt: number;
  winnerId: string;
  players: { playerId: string; name: string; isGuest: boolean; cardsLeft: number }[];
};

export interface MatchRepository {
  save(match: MatchRecord): Promise<void>;
  historyFor(userId: string, limit: number): Promise<MatchRecord[]>;
  statsFor(userId: string): Promise<{ played: number; won: number }>;
}