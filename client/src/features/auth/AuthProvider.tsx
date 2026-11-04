"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

type AuthState = {
  user: api.User | null;
  loading: boolean;
  loginGuest: (name: string) => Promise<void>;
  loginGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginGuest = useCallback(async (name: string) => {
    const u = await api.loginGuest(name);
    disconnectSocket(); // a new identity needs a fresh connection
    setUser(u);
  }, []);

  const loginGoogle = useCallback(async (credential: string) => {
    const u = await api.loginGoogle(credential);
    disconnectSocket();
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    disconnectSocket();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginGuest, loginGoogle, logout }),
    [user, loading, loginGuest, loginGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
