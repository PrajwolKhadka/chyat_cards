import { z } from "zod";
import { COLORS } from "../../domain/card";
import { EMOTES } from "../../domain/emote";

export const emptySchema = z.object({});
export const joinSchema = z.object({ code: z.string().trim().min(1).max(10) });
export const playSchema = z.object({
  cardId: z.string().min(1).max(32),
  color: z.enum(COLORS).optional(),
});
export const catchSchema = z.object({ targetId: z.string().min(1).max(64) });
export const emoteSchema = z.object({ emote: z.enum(EMOTES) });