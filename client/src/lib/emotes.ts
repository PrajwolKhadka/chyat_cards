import type { EmoteId } from "./types";

// Emoji plus a short Nepali phrase for each taunt. Change the words freely.
export const EMOTE_INFO: Record<EmoteId, { emoji: string; text: string }> = {
  laugh: { emoji: "😂", text: "हा हा!" },
  cry: { emoji: "😭", text: "आइयो!" },
  angry: { emoji: "😡", text: "रिस उठ्यो" },
  clap: { emoji: "👏", text: "वाह!" },
  fire: { emoji: "🔥", text: "आगो!" },
  skull: { emoji: "💀", text: "सकियो!" },
  sleepy: { emoji: "😴", text: "छिटो खेल!" },
  thumbsdown: { emoji: "👎", text: "हुँदै हुँदैन" },
  namaste: { emoji: "🙏", text: "नमस्ते" },
  momo: { emoji: "🥟", text: "मोमो खाऊँ!" },
};
