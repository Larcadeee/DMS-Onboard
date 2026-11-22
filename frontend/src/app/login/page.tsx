"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, initializeCsrf } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui/Primitives";
import AuthLayout from "@/components/auth/AuthLayout";
import { GoogleSignIn, isGoogleSignInConfigured } from "@/components/auth/GoogleSignIn";
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
  const [googleBusy, setGoogleBusy] = useState(false);
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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      await initializeCsrf(controller.signal);

      await apiRequest("/api/v1/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      const signedIn = await refresh(controller.signal);

      if (!signedIn) {
        setError("Your session could not be established. Enable cookies for this site and try again.");
        return;
      }

      router.replace(destinationFor(signedIn, next));
      router.refresh();
    } catch (err) {
      if (controller.signal.aborted) {
        setError("Sign in timed out. Check your connection and try again.");
      } else {
        const message = err instanceof Error ? err.message : "Unable to sign in.";
        setError(
          message === "The provided credentials do not match our records."
            ? "Invalid email address or password."
            : message
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function handleGoogle(credential: string) {
    setGoogleBusy(true);
    setError("");

    try {
      await initializeCsrf();

      const result = await apiRequest("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });

      if (result?.account_status === "PENDING") {
        setError("Your registration is awaiting administrator approval. You can sign in once it is approved.");
        return;
      }

      const signedIn = await refresh();

      if (!signedIn) {
        setError("Your session could not be established. Enable cookies for this site and try again.");
        return;
      }

      router.replace(destinationFor(signedIn, next));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in with Google.";
      setError(message);
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthLayout>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use the account issued by the Dispatch Management Section.
            </p>

            {expired && !error && (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800" role="status">
                Your session expired or is no longer valid. Please sign in again.
              </div>
            )}

            {isGoogleSignInConfigured() && (
              <>
                <div className="mt-6">
                  <GoogleSignIn onCredential={handleGoogle} text="signin_with" disabled={googleBusy || loading} />
                </div>
                <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-faint">
                  <span className="h-px flex-1 bg-line" />
                  or sign in with email
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form onSubmit={handleLogin} className={isGoogleSignInConfigured() ? "space-y-4" : "mt-6 space-y-4"}>
              <Field label="Email address" required>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                  placeholder="name@cdrrmd.gov.ph"
                  autoFocus
                />
              </Field>

              <Field label="Password" required>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    className="pr-16"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1.5 top-0.5 min-h-11 rounded px-2 text-xs font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>

              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} disabled={loading || googleBusy} className="w-full">
                {loading ? "Signing in" : "Sign in"}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted">
              New trainee?{" "}
              <Link href="/register" className="font-medium text-brand hover:text-brand-dark">
                Create an account
              </Link>
            </p>

            <p className="mt-6 border-t border-line pt-5 text-[11px] leading-5 text-muted">
              Having trouble signing in? Contact your training administrator or the DMS system administrator.
            </p>
    </AuthLayout>
  );
}
