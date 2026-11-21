"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AuthGuard from "./AuthGuard";
import { useSidebarState } from "./SidebarState";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarState();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-canvas">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>

        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            collapsed={collapsed}
            onMenu={() => setMobileOpen(true)}
            onCollapse={toggleCollapsed}
          />

          <main id="main-content" className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div key={pathname} className="page-transition mx-auto w-full max-w-[1500px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
