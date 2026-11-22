"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, initializeCsrf } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { GoogleSignIn, isGoogleSignInConfigured } from "@/components/auth/GoogleSignIn";
import { Button, Field, Input } from "@/components/ui/Primitives";
import AuthLayout from "@/components/auth/AuthLayout";

const initialForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  contact_number: "",
  password: "",
  password_confirmation: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.must_change_password ? "/change-password" : user.role?.slug === "etc_trainee" ? "/trainee/dashboard" : "/dashboard");
    }
  }, [authLoading, user, router]);

  function update(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFailure(err: unknown) {
    if (err instanceof ApiError) {
      setFieldErrors(err.errors ?? {});
      setError(err.message);
      return;
    }

    setError(err instanceof Error ? err.message : "Unable to submit registration.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      await initializeCsrf();
      await apiRequest("/api/v1/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setSubmittedEmail(form.email.trim());
    } catch (err) {
      handleFailure(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle(credential: string) {
    setGoogleBusy(true);
    setError("");
    setFieldErrors({});

    try {
      await initializeCsrf();
      const result = await apiRequest("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });

      if (result?.account_status === "PENDING") {
        setSubmittedEmail(result.email ?? "your Google account");
        return;
      }

      const signedIn = await refresh();

      if (signedIn) {
        router.replace(signedIn.must_change_password ? "/change-password" : "/trainee/dashboard");
        return;
      }

      setError("Your session could not be established. Enable cookies for this site and try again.");
    } catch (err) {
      handleFailure(err);
    } finally {
      setGoogleBusy(false);
    }
  }

  if (submittedEmail) {
    return (
      <main className="grid min-h-screen place-items-center bg-white px-5 py-12">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">Registration submitted</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your account request for <span className="font-medium text-ink">{submittedEmail}</span> is awaiting approval by an Administrator or Section Head.
          </p>
          <p className="mt-4 rounded-md border border-line bg-canvas px-3.5 py-2.5 text-xs leading-5 text-muted">
            You will be able to sign in once your registration is approved. If it is rejected, contact the DMS system administrator.
          </p>
          <Link href="/login" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            Return to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthLayout>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Registrations are reviewed before access is granted. Use accurate details so your trainer can identify you.
            </p>

            {isGoogleSignInConfigured() && (
              <>
                <div className="mt-6">
                  <GoogleSignIn onCredential={handleGoogle} text="signup_with" disabled={googleBusy || submitting} />
                </div>
                <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-faint">
                  <span className="h-px flex-1 bg-line" />
                  or register with email
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form onSubmit={submit} className={isGoogleSignInConfigured() ? "space-y-4" : "mt-6 space-y-4"} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <Input required maxLength={100} autoComplete="given-name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} disabled={submitting} />
                  <FieldError messages={fieldErrors.first_name} />
                </Field>
                <Field label="Middle name">
                  <Input maxLength={100} autoComplete="additional-name" value={form.middle_name} onChange={(e) => update("middle_name", e.target.value)} disabled={submitting} />
                  <FieldError messages={fieldErrors.middle_name} />
                </Field>
              </div>

              <Field label="Last name" required>
                <Input required maxLength={100} autoComplete="family-name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} disabled={submitting} />
                <FieldError messages={fieldErrors.last_name} />
              </Field>

              <Field label="Email address" required>
                <Input required type="email" autoComplete="email" placeholder="name@cdrrmd.gov.ph" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={submitting} />
                <FieldError messages={fieldErrors.email} />
              </Field>

              <Field label="Contact number" required>
                <Input required maxLength={50} autoComplete="tel" placeholder="09XX XXX XXXX" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} disabled={submitting} />
                <FieldError messages={fieldErrors.contact_number} />
              </Field>

              <Field label="Password" required hint="At least 12 characters with upper and lowercase letters and numbers.">
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    disabled={submitting}
                    className="pr-16"
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
                <FieldError messages={fieldErrors.password} />
              </Field>

              <Field label="Confirm password" required>
                <Input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password_confirmation} onChange={(e) => update("password_confirmation", e.target.value)} disabled={submitting} />
                <FieldError messages={fieldErrors.password_confirmation} />
              </Field>

              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" loading={submitting} disabled={submitting || googleBusy} className="w-full">
                {submitting ? "Submitting registration" : "Submit registration"}
              </Button>

              <p className="text-center text-xs text-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
                  Sign in
                </Link>
              </p>
            </form>
    </AuthLayout>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;

  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}
