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
import { useRouter } from "next/navigation";
import { api, ApiError, AUTH_UNAUTHORIZED_EVENT } from "@/lib/api/client";
import { clearApiCache } from "@/lib/hooks";
import type { AuthUser } from "@/lib/format";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  can: (permission: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const idleTimeoutMinutes = Number(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES ?? 60);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const result = await api.get<{ user: AuthUser }>("/api/v1/user");
      setUser(result.user);
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setUser(null);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const redirectToLogin = useCallback(
    (expired: boolean) => {
      setUser(null);
      clearApiCache();

      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/login")) return;

      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      router.replace(`/login?${expired ? "expired=1&" : ""}next=${next}`);
    },
    [router]
  );

  // A 401 from any API call means the session is no longer valid. Clear the
  // local authentication state and require the user to sign in again.
  useEffect(() => {
    const onUnauthorized = () => redirectToLogin(true);

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);

    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [redirectToLogin]);

  // Revalidate the session when the user returns to the application so an
  // expired session is detected before any protected data is trusted.
  useEffect(() => {
    function revalidate() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);

    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/logout");
    } catch {
      // The session may already be expired; local state is cleared regardless.
    } finally {
      setUser(null);
      clearApiCache();
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  // Enforce an idle limit in the browser that mirrors the server-side session
  // lifetime. The server remains authoritative; this only improves UX.
  useEffect(() => {
    if (!user) return;

    const timeout = Number.isFinite(idleTimeoutMinutes) && idleTimeoutMinutes > 0
      ? idleTimeoutMinutes * 60_000
      : 60 * 60_000;
    let timer = window.setTimeout(() => redirectToLogin(true), timeout);

    function reset() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => redirectToLogin(true), timeout);
    }

    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [user, redirectToLogin]);

  const can = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, refresh, can, logout }),
    [user, loading, refresh, can, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
