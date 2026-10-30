import { parseCookie, stringifySetCookie } from "cookie";

export const SESSION_COOKIE = "unonepal_session";

export function setSessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(secure: boolean): string {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function readToken(cookieHeader: string | undefined): string | undefined {
  return parseCookie(cookieHeader ?? "")[SESSION_COOKIE];
}