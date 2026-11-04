// export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
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

export type HistoryResponse = {
  stats: { played: number; won: number };
  matches: {
    roomCode: string;
    finishedAt: number;
    won: boolean;
    players: { name: string; isGuest: boolean; cardsLeft: number }[];
  }[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", // sends the session cookie
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong", res.status);
  return data as T;
}

export async function getMe(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>("/auth/me");
    return data.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function loginGuest(name: string): Promise<User> {
  const data = await request<{ user: User }>("/auth/guest", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data.user;
}

export async function loginGoogle(credential: string): Promise<User> {
  const data = await request<{ user: User }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function getHistory(): Promise<HistoryResponse> {
  return request<HistoryResponse>("/me/history");
}
