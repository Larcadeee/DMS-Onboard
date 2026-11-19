"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import AuthGuard from "@/components/layout/AuthGuard";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">
          Change Your Password
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          You must change your temporary password before accessing the system.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </main>
    </AuthGuard>
  );
}