import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { RateLimiter } from "../../infrastructure/RateLimiter";
import { requireSession, sessionOf } from "./middleware";
import type { Session, TokenService } from "../../application/ports/Auth";
import { createGuest, type AuthDeps } from "../../application/authUsecases";

const publicUser = (s: Session) => ({ id: s.sub, name: s.name, isGuest: s.guest });

export function authRoutes(opts: { auth: AuthDeps; tokens: TokenService }): Router {
  const router = Router();

  const limiter = new RateLimiter(20, 60_000);
  setInterval(() => limiter.sweep(), 60_000).unref();
  const limited: RequestHandler = (req, res, next) => {
    if (!limiter.allow(req.ip ?? "unknown")) {
      res.status(429).json({ error: "Too many attempts, wait a minute" });
      return;
    }
    next();
  };

  router.post("/guest", limited, async (req, res) => {
    const { name } = z.object({ name: z.string().max(60) }).parse(req.body);
    const result = await createGuest(opts.auth, name);
    res.json({ token: result.token, user: publicUser(result.session) });
  });

  router.get("/me", requireSession(opts.tokens), (_req, res) => {
    res.json({ user: publicUser(sessionOf(res)) });
  });

  return router;
}