import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { JoseTokenService } from "./infrastructure/auth/jose";
import { secureRng } from "./infrastructure/secureRng";
import type { AuthDeps } from "./application/authUsecases";
import type { GameDeps } from "./application/gameUsecases";
import { MemoryRoomRepository } from "./infrastructure/MemoryRoomRepository";
import { errorHandler, requireSameOrigin } from "./infrastructure/http/middleware";
import { authRoutes } from "./infrastructure/http/route";
import { attachSocketServer } from "./infrastructure/socket/socketServer";

async function main() {
  const secure = env.NODE_ENV === "production";
  const tokens = new JoseTokenService(env.JWT_SECRET);

  const auth: AuthDeps = {
    tokens,
    newId: () => `guest_${randomUUID()}`,
  };

  const deps: GameDeps = {
    rooms: new MemoryRoomRepository(), // swap for a Redis version here when we scale
    rng: secureRng,
    now: () => Date.now(),
  };

  const app = express();
  if (secure) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "2kb" }));
  app.use(requireSameOrigin(env.CLIENT_ORIGINS));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/auth", authRoutes({ auth, tokens, secure }));
  app.use(errorHandler);

  const server = http.createServer(app);
  attachSocketServer(server, { deps, tokens, clientOrigins: env.CLIENT_ORIGINS });

  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`server running on port ${env.PORT}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (reason) => {
  console.error("unhandled rejection", reason);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});