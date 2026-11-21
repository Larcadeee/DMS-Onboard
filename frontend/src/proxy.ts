import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface ProxyUser {
  role?: { slug?: string } | null;
  must_change_password?: boolean;
}

const TRAINEE_PATHS = ["/trainee", "/notifications", "/profile", "/change-password"];

const API_TARGET = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";
const SESSION_COOKIE = process.env.API_SESSION_COOKIE || "cdrrmd-session";
const PUBLIC_PAGES = ["/login", "/register"];

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

  // If user is not authenticated and on a public page, just let them stay
  if (!user && isPublic) {
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  // If user IS authenticated and on a public page (/login), redirect to dashboard
  if (isPublic || pathname === "/") {
    return NextResponse.redirect(new URL(dashboardFor(user), request.url));
  }

  if (user.must_change_password && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  const trainee = user.role?.slug === "etc_trainee";

  // /trainees (plural) is admin trainee management. /trainee/* (singular) is
  // the trainee portal and must only be reachable by trainees.
  const isTraineePortal = pathname === "/trainee" || pathname.startsWith("/trainee/");
  const isAdminTrainees = pathname === "/trainees" || pathname.startsWith("/trainees/");

  if (trainee) {
    const allowed = TRAINEE_PATHS.some((path) => pathname.startsWith(path));
    if (!allowed || isAdminTrainees) {
      return NextResponse.redirect(new URL("/trainee/dashboard", request.url));
    }
  } else if (isTraineePortal && !isAdminTrainees) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|sanctum|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
