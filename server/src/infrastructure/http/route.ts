import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { RateLimiter } from "../../infrastructure/RateLimiter";
import { clearSessionCookie, setSessionCookie } from "../sessionCookie";
import { requireSession, sessionOf } from "./middleware";
import { Session, TokenService } from "../../application/ports/Auth";
import { AuthDeps, createGuest, loginWithGoogle } from "../../application/authUsecases";
import { MatchRepository } from "../../application/ports/Persistance";

const publicUser = (s: Session) => ({ id: s.sub, name: s.name, isGuest: s.guest });

export function authRoutes(opts: { auth: AuthDeps; tokens: TokenService; secure: boolean }): Router {
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

  router.post("/google", limited, async (req, res) => {
    const { credential } = z
      .object({ credential: z.string().min(20).max(4096) })
      .parse(req.body);
    const result = await loginWithGoogle(opts.auth, credential);
    res.setHeader("Set-Cookie", setSessionCookie(result.token, result.maxAge, opts.secure));
    res.json({ user: publicUser(result.session) });
  });

  router.post("/guest", limited, async (req, res) => {
    const { name } = z.object({ name: z.string().max(60) }).parse(req.body);
    const result = await createGuest(opts.auth, name);
    res.setHeader("Set-Cookie", setSessionCookie(result.token, result.maxAge, opts.secure));
    res.json({ user: publicUser(result.session) });
  });

  router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", clearSessionCookie(opts.secure));
    res.json({ ok: true });
  });

  router.get("/me", requireSession(opts.tokens), (_req, res) => {
    res.json({ user: publicUser(sessionOf(res)) });
  });

  return router;
}

export function meRoutes(opts: { tokens: TokenService; matches: MatchRepository }): Router {
  const router = Router();

  router.get("/history", requireSession(opts.tokens), async (_req, res) => {
    const session = sessionOf(res);
    if (session.guest) {
      res.status(403).json({ error: "Sign in with Google to keep a win history" });
      return;
    }

    const [history, stats] = await Promise.all([
      opts.matches.historyFor(session.sub, 20),
      opts.matches.statsFor(session.sub),
    ]);

    res.json({
      stats,
      matches: history.map((m) => ({
        roomCode: m.roomCode,
        finishedAt: m.finishedAt,
        won: m.winnerId === session.sub,
        players: m.players.map((p) => ({
          name: p.name,
          isGuest: p.isGuest,
          cardsLeft: p.cardsLeft,
        })),
      })),
    });
  });

  return router;
}