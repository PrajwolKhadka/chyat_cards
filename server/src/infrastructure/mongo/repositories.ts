import type { GoogleProfile } from "../../application/ports/Auth";
import { MatchRecord, MatchRepository, User, UserRepository } from "../../application/ports/Persistance";

import { MatchModel, UserModel } from "./models";

export class MongoUserRepository implements UserRepository {
  async upsertGoogle(profile: GoogleProfile): Promise<User> {
    const doc = await UserModel.findOneAndUpdate(
      { googleId: profile.googleId },
      { $set: { name: profile.name, ...(profile.picture ? { picture: profile.picture } : {}) } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    if (!doc) throw new Error("Could not save user");

    return {
      id: doc._id.toString(),
      googleId: doc.googleId,
      name: doc.name,
      picture: doc.picture ?? undefined,
    };
  }
}

export class MongoMatchRepository implements MatchRepository {
  async save(match: MatchRecord): Promise<void> {
    await MatchModel.create({
      roomCode: match.roomCode,
      finishedAt: new Date(match.finishedAt),
      winnerId: match.winnerId,
      userIds: match.players.filter((p) => !p.isGuest).map((p) => p.playerId),
      players: match.players,
    });
  }

  async historyFor(userId: string, limit: number): Promise<MatchRecord[]> {
    const docs = await MatchModel.find({ userIds: userId })
      .sort({ finishedAt: "desc" })
      .limit(limit)
      .lean();

    return docs.map((d) => ({
      roomCode: d.roomCode,
      finishedAt: d.finishedAt.getTime(),
      winnerId: d.winnerId,
      players: d.players.map((p) => ({
        playerId: p.playerId ?? "",
        name: p.name ?? "",
        isGuest: p.isGuest ?? true,
        cardsLeft: p.cardsLeft ?? 0,
      })),
    }));
  }

  async statsFor(userId: string): Promise<{ played: number; won: number }> {
    const [played, won] = await Promise.all([
      MatchModel.countDocuments({ userIds: userId }),
      MatchModel.countDocuments({ userIds: userId, winnerId: userId }),
    ]);
    return { played, won };
  }
}