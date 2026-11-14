"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

type LoginResult =
  | { twoFactorRequired: true; userId: string; devMailPreviewUrl: string | null }
  | { twoFactorRequired: false; user: PublicUser };

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string, rememberDevice: boolean) => Promise<LoginResult>;
  verifyTwoFactor: (userId: string, code: string, rememberDevice: boolean) => Promise<PublicUser>;
  signup: (input: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    bio?: string;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  updateProfile: (input: Partial<PublicUser>) => Promise<PublicUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: PublicUser | null }) {
  // Seeded from the server (see session.server.ts, read in the root layout) so the
  // first render already reflects the real session instead of a logged-out guess -
  // that guess is what caused the login UI to flash before the real content showed up.
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ user: PublicUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Silently re-validate against the backend after hydration, in case the access
    // token expired between the server render and now - without the loading flag,
    // so an already-correct server-rendered UI never flickers while this resolves.
    apiFetch<{ user: PublicUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string, rememberDevice: boolean) => {
    const res = await apiFetch<LoginResult>("/api/auth/login", {
      method: "POST",
      body: { email, password, rememberDevice },
    });
    if (!res.twoFactorRequired) setUser(res.user);
    return res;
  }, []);

  const verifyTwoFactor = useCallback(async (userId: string, code: string, rememberDevice: boolean) => {
    const res = await apiFetch<{ user: PublicUser }>("/api/auth/login/verify-2fa", {
      method: "POST",
      body: { userId, code, rememberDevice },
    });
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(
    async (input: { email: string; username: string; password: string; firstName?: string; bio?: string }) => {
      const res = await apiFetch<{ user: PublicUser }>("/api/auth/signup", { method: "POST", body: input });
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: Partial<PublicUser>) => {
    const res = await apiFetch<{ user: PublicUser }>("/api/auth/me", { method: "PATCH", body: input });
    setUser(res.user);
    return res.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, verifyTwoFactor, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiRequestError };
