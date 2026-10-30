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