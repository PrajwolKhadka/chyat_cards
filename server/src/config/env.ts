import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32),
});

// The server refuses to start with a missing or weak setting
const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  // CLIENT_URL can hold several addresses separated by commas
  CLIENT_ORIGINS: parsed.CLIENT_URL.split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean),
};