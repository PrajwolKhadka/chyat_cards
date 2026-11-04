import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import type { Session, TokenService } from "../../application/ports/Auth";
import { AuthError } from "../../application/authUsecases";

// Blocks cross site form posts and forged requests that try to reuse a logged in browser
// export function requireSameOrigin(clientUrl: string): RequestHandler {
//   return (req, res, next) => {
//     if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
//       next();
//       return;
//     }
//     if (req.headers.origin !== clientUrl) {
//       res.status(403).json({ error: "Bad origin" });
//       return;
//     }
//     next();
//   };
// }
export function requireSameOrigin(allowedOrigins: string[]): RequestHandler {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (!origin || !allowedOrigins.includes(origin)) {
      res.status(403).json({ error: "Bad origin" });
      return;
    }
    next();
  };
}

export function requireSession(tokens: TokenService): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    try {
      res.locals.session = await tokens.verify(token);
      next();
    } catch {
      res.status(401).json({ error: "Session expired" });
    }
  };
}

export function sessionOf(res: Response): Session {
  return res.locals.session as Session;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError || err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (err instanceof AuthError) {
    res.status(401).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};