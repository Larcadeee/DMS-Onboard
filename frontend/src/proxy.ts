import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface ProxyUser {
  role?: { slug?: string } | null;
  must_change_password?: boolean;
}

const TRAINEE_PATHS = ["/trainee", "/notifications", "/profile", "/change-password"];

const API_TARGET = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";
const SESSION_COOKIE = process.env.API_SESSION_COOKIE || "cdrrmd-session";
const PUBLIC_PAGES = ["/login"];

async function authenticatedUser(request: NextRequest): Promise<ProxyUser | null> {
  const cookies = request.headers.get("cookie") ?? "";

  if (!cookies.split(";").some((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`))) {
    return null;
  }

  try {
    const response = await fetch(`${API_TARGET}/api/v1/user`, {
      headers: {
        Accept: "application/json",
        Cookie: cookies,
        // Sanctum treats a request as stateful (session-authenticated) when
        // the Origin/Referer matches a configured stateful domain.
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { user?: ProxyUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

function dashboardFor(user: ProxyUser): string {
  return user.role?.slug === "etc_trainee" ? "/trainee/dashboard" : "/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PAGES.includes(pathname);
  const user = await authenticatedUser(request);

  if (!user) {
    if (isPublic) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (isPublic || pathname === "/") {
    return NextResponse.redirect(new URL(dashboardFor(user), request.url));
  }

  if (user.must_change_password && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  const trainee = user.role?.slug === "etc_trainee";

  if (trainee && !TRAINEE_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/trainee/dashboard", request.url));
  }

  if (!trainee && pathname.startsWith("/trainee")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|sanctum|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
