"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";

function pageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return "Dashboard";
  if (segments[0] === "trainees" && segments[1]) return "Trainee Profile";
  if (segments[0] === "programs" && segments[1]) return "Program Details";
  if (segments[0] === "curriculum") return "Training Curriculum";
  if (segments[0] === "trainee") {
    const map: Record<string, string> = {
      dashboard: "My Dashboard",
      program: "My Onboarding Program",
      materials: "My Learning Materials",
      schedule: "My Training Schedule",
      assessments: "My Assessments",
      competencies: "My Competencies",
      attendance: "My Attendance",
      history: "My Training History",
    };
    return map[segments[1]] ?? "Trainee Portal";
  }

  return titleCase(segments[segments.length - 1]);
}

export default function Header({
  onMenu,
  onCollapse,
}: {
  onMenu: () => void;
  onCollapse: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(user?.unread_notifications ?? 0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(user?.unread_notifications ?? 0);
  }, [user]);

  useEffect(() => {
    api.get<{ unread_count: number }>("/api/v1/notifications")
      .then((result) => setUnread(result.unread_count))
      .catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button type="button" onClick={onCollapse} className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block" aria-label="Collapse navigation">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{pageTitle(pathname)}</p>
          <p className="truncate text-xs text-slate-500">CDRRMD New Hire Onboarding Management System</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <Avatar src={user?.avatar_url} name={user?.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-slate-800">{user?.name ?? "User"}</span>
              <span className="block text-xs text-slate-500">{user?.role?.name ?? ""}</span>
            </span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white py-1 shadow-lg">
              <div className="border-b px-4 py-2">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Profile settings</Link>
              <Link href="/change-password" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Change password</Link>
              <button
                type="button"
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
