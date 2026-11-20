"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import AuthGuard from "@/components/layout/AuthGuard";
import { Button, Field, Input } from "@/components/ui/Primitives";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(user?.role?.slug === "etc_trainee" ? "/trainee/dashboard" : "/dashboard");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/api/v1/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          password_confirmation: confirmation,
        }),
      });

      const me = await apiRequest("/api/v1/me");
      const home = me.user?.role?.slug === "etc_trainee" ? "/trainee/dashboard" : "/dashboard";
      router.replace(home);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-canvas">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-xs font-medium text-ink-soft transition-colors hover:border-slate-400 hover:bg-canvas hover:text-ink"
              title="Return to the previous page"
              aria-label="Go back to the previous page"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M15 10H5M9 6l-4 4 4 4" />
              </svg>
              Back
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[10px] font-bold tracking-wide text-white">911</div>
              <span className="text-[11px] font-medium text-muted">CDRRMD DMS</span>
            </div>
          </div>

          <div className="flex flex-1 items-center py-10">
            <div className="w-full max-w-xl">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                <span className="h-px w-4 bg-brand" aria-hidden="true" />
                Account security
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Change password</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                {user?.must_change_password
                  ? "Your temporary password must be replaced before you can continue."
                  : "Choose a new password for your CDRRMD DMS account."}
              </p>

              <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Current password" required>
                    <Input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </Field>

                  <Field label="New password" required hint="At least 12 characters. Use a mix of uppercase, lowercase and numbers.">
                    <Input
                      type="password"
                      required
                      minLength={12}
                      autoComplete="new-password"
                      placeholder="Enter a new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>

                  <Field label="Confirm new password" required>
                    <Input
                      type="password"
                      required
                      minLength={12}
                      autoComplete="new-password"
                      placeholder="Re-enter the new password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </Field>

                  {error && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={goBack}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                      {loading ? "Updating password" : "Update password"}
                    </Button>
                  </div>
                </form>
              </div>

              <p className="mt-4 text-[11px] leading-5 text-muted">
                Changing your password signs out other active sessions on your account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
