"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AuthGuard from "./AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard>
          <div className="flex min-h-screen bg-slate-50">
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />

            <div className="flex min-w-0 flex-1 flex-col">
              <Header onMenu={() => setMobileOpen(true)} onCollapse={() => setCollapsed((value) => !value)} />

              <main className="flex-1 p-4 sm:p-6">{children}</main>
            </div>
          </div>
    </AuthGuard>
  );
}
