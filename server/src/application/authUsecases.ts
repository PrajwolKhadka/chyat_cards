import type { Session, TokenService } from "./ports/Auth";

export class AuthError extends Error {}

export const GUEST_TTL_SECONDS = 12 * 60 * 60;

export type AuthDeps = {
  tokens: TokenService;
  newId: () => string;
};

export type LoginResult = { token: string; session: Session; maxAge: number };

function cleanName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20)
    .trim();
}

export async function createGuest(deps: AuthDeps, rawName: string): Promise<LoginResult> {
  const name = cleanName(rawName);
  if (!name) throw new AuthError("Enter a name to play");

  const session: Session = { sub: deps.newId(), name, guest: true };
  const token = await deps.tokens.sign(session, GUEST_TTL_SECONDS);
  return { token, session, maxAge: GUEST_TTL_SECONDS };
}