import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true, maxlength: 100 },
    picture: { type: String },
  },
  { timestamps: true },
);

export const UserModel = model("User", userSchema);

const matchPlayerSchema = new Schema(
  { playerId: String, name: String, isGuest: Boolean, cardsLeft: Number },
  { _id: false },
);

const matchSchema = new Schema({
  roomCode: { type: String, required: true },
  finishedAt: { type: Date, required: true },
  winnerId: { type: String, required: true },
  userIds: { type: [String], index: true }, // only logged in players, for fast history lookups
  players: [matchPlayerSchema],
});

export const MatchModel = model("Match", matchSchema);