"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isTrainee } from "@/lib/format";

const personalPaths = ["/trainee", "/notifications", "/profile", "/change-password"];

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const trainee = isTrainee(user);

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!user) return;

    if (trainee && !personalPaths.some((path) => pathname.startsWith(path))) {
      router.replace("/trainee/dashboard");
    }

    if (user.must_change_password && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [user, trainee, pathname, searchParams, router, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Verifying account...
      </div>
    );
  }

  return <>{children}</>;
}
