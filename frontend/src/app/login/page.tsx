"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, initializeCsrf } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/format";

const PERSONAL_PATHS = ["/notifications", "/profile"];

function destinationFor(user: AuthUser, next: string | null): string {
  if (user.must_change_password) return "/change-password";

  const requested =
    next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/change-password")
      ? next
      : "";

  if (user.role?.slug === "etc_trainee") {
    if (requested && (requested.startsWith("/trainee") || PERSONAL_PATHS.some((path) => requested.startsWith(path)))) {
      return requested;
    }

    return "/trainee/dashboard";
  }

  if (requested && !requested.startsWith("/trainee")) {
    return requested;
  }

  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refresh } = useAuth();
  const next = searchParams.get("next");
  const expired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(destinationFor(user, next));
    }
  }, [authLoading, user, next, router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await initializeCsrf();

      await apiRequest("/api/v1/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // Confirm the session cookie is accepted before leaving the login page.
      // Without this the route guard would see no user and bounce back here.
      const signedIn = await refresh();

      if (!signedIn) {
        setError("Your session could not be established. Enable cookies for this site and try again.");
        return;
      }

      router.replace(destinationFor(signedIn, next));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(
        message === "The provided credentials do not match our records."
          ? "Invalid email address or password."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold text-white">
            911
          </div>

          <h1 className="text-2xl font-bold text-slate-900">CDRRMD</h1>

          <p className="mt-2 text-sm text-slate-500">New Hire Onboarding Management System</p>

          <p className="mt-1 text-xs text-slate-400">Dispatch Management Section</p>
        </div>

        {expired && !error && (
          <div className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Your session has expired or is no longer valid. Please sign in again.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-slate-700 disabled:bg-slate-50"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded-lg border px-4 py-3 pr-16 outline-none focus:border-slate-700 disabled:bg-slate-50"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-3 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Butuan City Disaster Risk Reduction and Management
        </p>
      </div>
    </main>
  );
}
