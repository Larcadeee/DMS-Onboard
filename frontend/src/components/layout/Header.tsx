"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationPopover } from "@/components/layout/NotificationPopover";

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
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-md p-2 text-muted transition-colors hover:bg-canvas hover:text-ink lg:hidden"
          aria-label="Open navigation"
          title="Open navigation"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="hidden rounded-md p-2 text-muted transition-colors hover:bg-canvas hover:text-ink lg:block"
          aria-label="Collapse navigation"
          title="Collapse sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <path d="M9.5 4.5v15M13.5 9l3 3-3 3" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink">{pageTitle(pathname)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <NotificationPopover unreadCount={unread} />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-canvas sm:px-2"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar src={user?.avatar_url} name={user?.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-[13px] font-medium text-ink">{user?.name ?? "User"}</span>
              <span className="block max-w-40 truncate text-[11px] text-muted">{user?.role?.name ?? ""}</span>
            </span>
            <svg viewBox="0 0 20 20" className="hidden h-4 w-4 text-faint sm:block" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-lg border border-line bg-surface py-1 shadow-lg" role="menu">
              <div className="border-b border-line px-4 py-2.5">
                <p className="truncate text-[13px] font-medium text-ink">{user?.name}</p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
              </div>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-ink" role="menuitem">
                Profile settings
              </Link>
              <Link href="/change-password" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-ink" role="menuitem">
                Change password
              </Link>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50"
                role="menuitem"
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