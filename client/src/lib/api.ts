function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

export type User = { id: string; name: string; isGuest: boolean };

const TOKEN_KEY = "uno_token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage can be blocked, then the session lasts until the page is refreshed
  }
}

function setToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore, see getToken
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong", res.status);
  return data as T;
}

export async function getMe(): Promise<User | null> {
  // No saved token means nobody is signed in, so there is no need to wake the server
  if (!getToken()) return null;

  try {
    const data = await request<{ user: User }>("/auth/me");
    return data.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setToken(null);
      return null;
    }
    throw err;
  }
}

export async function loginGuest(name: string): Promise<User> {
  const data = await request<{ token: string; user: User }>("/auth/guest", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  setToken(null);
}