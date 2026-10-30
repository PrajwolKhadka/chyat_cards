import { GoogleVerifier, Session, TokenService } from "./ports/auth";
import { UserRepository } from "./ports/Persistance";

export class AuthError extends Error {}

export const GUEST_TTL_SECONDS = 12 * 60 * 60;
export const USER_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AuthDeps = {
  users: UserRepository;
  google: GoogleVerifier;
  tokens: TokenService;
  newId: () => string;
};

export type LoginResult = { token: string; session: Session; maxAge: number };

function displayName(raw: string, fallback: string): string {
  const name = raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20)
    .trim();
  return name || fallback;
}

export async function loginWithGoogle(deps: AuthDeps, credential: string): Promise<LoginResult> {
  let profile;
  try {
    profile = await deps.google.verify(credential);
  } catch {
    throw new AuthError("Google sign in failed");
  }

  const user = await deps.users.upsertGoogle(profile);
  const session: Session = { sub: user.id, name: displayName(user.name, "Player"), guest: false };
  const token = await deps.tokens.sign(session, USER_TTL_SECONDS);
  return { token, session, maxAge: USER_TTL_SECONDS };
}

export async function createGuest(deps: AuthDeps, rawName: string): Promise<LoginResult> {
  const name = displayName(rawName, "");
  if (!name) throw new AuthError("Enter a name to play as a guest");

  const session: Session = { sub: deps.newId(), name, guest: true };
  const token = await deps.tokens.sign(session, GUEST_TTL_SECONDS);
  return { token, session, maxAge: GUEST_TTL_SECONDS };
}