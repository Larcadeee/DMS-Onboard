"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { isTrainee } from "@/lib/format";
import { cn } from "@/components/ui/Primitives";

interface NavItem {
  name: string;
  href: string;
  permission?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ name: "Dashboard", href: "/dashboard", permission: "dashboard.view" }],
  },
  {
    title: "Training Management",
    items: [
      { name: "Trainees", href: "/trainees", permission: "trainees.view" },
      { name: "Onboarding Programs", href: "/programs", permission: "programs.view" },
      { name: "Training Curriculum", href: "/curriculum", permission: "programs.view" },
      { name: "Training Materials", href: "/training-materials", permission: "materials.view" },
      { name: "Training Schedule", href: "/schedule", permission: "sessions.view" },
      { name: "Attendance", href: "/attendance", permission: "attendance.view" },
    ],
  },
  {
    title: "Evaluation and Monitoring",
    items: [
      { name: "Assessments", href: "/assessments", permission: "assessments.view" },
      { name: "Assessment Results", href: "/assessment-results", permission: "assessments.results.view" },
      { name: "Competency Framework", href: "/competencies", permission: "competencies.view" },
      { name: "Competency Evaluations", href: "/competency-evaluations", permission: "competencies.view" },
      { name: "Onboarding Progress", href: "/onboarding-progress", permission: "progress.view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Reports and Analytics", href: "/reports", permission: "reports.view" },
      { name: "User Management", href: "/users", permission: "users.view" },
      { name: "Roles and Permissions", href: "/roles-permissions", permission: "roles.manage" },
      { name: "Audit Logs", href: "/audit-logs", permission: "audit_logs.view" },
      { name: "System Settings", href: "/settings", permission: "settings.manage" },
    ],
  },
];

const traineeGroups: NavGroup[] = [
  {
    title: "My Onboarding",
    items: [
      { name: "My Dashboard", href: "/trainee/dashboard" },
      { name: "My Program", href: "/trainee/program" },
      { name: "Learning Materials", href: "/trainee/materials" },
      { name: "My Schedule", href: "/trainee/schedule" },
      { name: "My Assessments", href: "/trainee/assessments" },
      { name: "My Competencies", href: "/trainee/competencies" },
      { name: "My Attendance", href: "/trainee/attendance" },
      { name: "My Training History", href: "/trainee/history" },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "Notifications", href: "/notifications" },
      { name: "My Profile", href: "/profile" },
    ],
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const trainee = isTrainee(user);
  const groups = trainee ? traineeGroups : adminGroups;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-white transition-all duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-64 lg:w-20" : "w-64"
        )}
      >
        <div className={cn("flex min-h-16 items-center gap-3 border-b px-4", collapsed && "lg:justify-center lg:px-2")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">911</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">CDRRMD DMS</p>
              <p className="truncate text-[11px] text-slate-500">Onboarding Management</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
          {groups.map((group) => {
            const items = group.items.filter((item) => trainee || !item.permission || can(item.permission));
            if (items.length === 0) return null;

            return (
              <div key={group.title}>
                {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={collapsed ? item.name : undefined}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm transition-colors",
                          active ? "bg-slate-900 font-medium text-white" : "text-slate-600 hover:bg-slate-100",
                          collapsed && "lg:text-center lg:text-xs"
                        )}
                      >
                        {collapsed ? item.name.slice(0, 2) : item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-slate-100",
              collapsed && "lg:justify-center"
            )}
            title="My Profile"
          >
            <Avatar src={user?.avatar_url} name={user?.name} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{user?.name ?? "User"}</span>
                <span className="block truncate text-xs text-slate-500">{user?.role?.name ?? "Profile"}</span>
              </span>
            )}
          </Link>
          <p className={cn("px-2 pt-2 text-[11px] text-slate-400", collapsed && "lg:text-center lg:text-[10px]")}>
            {collapsed ? "DMS" : "Butuan City CDRRMD"}
          </p>
        </div>
      </aside>
    </>
  );
}
