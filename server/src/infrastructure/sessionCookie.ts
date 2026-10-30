import { parse, serialize } from "cookie";

export const SESSION_COOKIE = "unonepal_session";

export function setSessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript on the page can never read the session
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(secure: boolean): string {
  return serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function readToken(cookieHeader: string | undefined): string | undefined {
  return parse(cookieHeader ?? "")[SESSION_COOKIE];
}