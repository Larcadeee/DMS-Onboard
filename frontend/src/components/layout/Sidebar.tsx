"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
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
    title: "My Portal",
    items: [
      { name: "Dashboard", href: "/trainee/dashboard", permission: "dashboard.view" },
      { name: "My Program", href: "/trainee/program", permission: "programs.view" },
      { name: "Learning Materials", href: "/trainee/materials", permission: "materials.view" },
      { name: "Training Schedule", href: "/trainee/schedule", permission: "sessions.view" },
      { name: "Assessments", href: "/trainee/assessments", permission: "assessments.view" },
      { name: "Competencies", href: "/trainee/competencies", permission: "competencies.view" },
      { name: "Attendance", href: "/trainee/attendance", permission: "attendance.view" },
      { name: "Training History", href: "/trainee/history", permission: "progress.view" },
    ],
  },
  {
    title: "Personal",
    items: [
      { name: "Notifications", href: "/notifications" },
      { name: "Profile", href: "/profile" },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="14.5" width="6" height="6" rx="1" />
    </>
  ),
  trainees: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.2 2.5-5.2 5.5-5.2s5.5 2 5.5 5.2" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17 15c2.2.4 3.5 2.1 3.5 4.5" />
    </>
  ),
  programs: (
    <>
      <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z" />
      <path d="m3 12 9 4.5 9-4.5M3 16l9 4.5 9-4.5" />
    </>
  ),
  curriculum: (
    <>
      <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z" />
      <path d="M5 16.5h14M9 8h6M9 11.5h4" />
    </>
  ),
  materials: (
    <>
      <path d="M3.5 7.5h6l2 2h9v9a2 2 0 0 1-2 2h-15v-13Z" />
      <path d="M3.5 7.5v-2a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2" />
    </>
  ),
  schedule: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h2M14 13h2M8 17h2" />
    </>
  ),
  attendance: (
    <>
      <rect x="3.5" y="4" width="17" height="16.5" rx="2" />
      <path d="m7 12 2.2 2.2L15.5 8.5M7 17h5" />
    </>
  ),
  assessments: (
    <>
      <path d="M7 4.5h10a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path d="M9 3h6v3H9zM9 11h6M9 15h4" />
    </>
  ),
  results: (
    <>
      <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  competencies: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  evaluations: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m9 13-1 8 4-2 4 2-1-8" />
    </>
  ),
  progress: (
    <>
      <path d="M3 18 9 12l3.5 3.5L21 7" />
      <path d="M16 7h5v5" />
    </>
  ),
  reports: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.1 2.4-5 5.5-5s5.5 1.9 5.5 5M16 5.5l1 1 2-2M16 12h5M18.5 9.5v5" />
    </>
  ),
  roles: (
    <>
      <path d="M12 3 20 6v5c0 5-3.5 8.4-8 10-4.5-1.6-8-5-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-4.7" />
    </>
  ),
  audit: (
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5v4h4M8 12h8M8 15.5h8M8 19h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4 3.3-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </>
  ),
};

function iconKey(href: string): string {
  if (href === "/dashboard" || href === "/trainee/dashboard") return "dashboard";
  if (href === "/trainees") return "trainees";
  if (href === "/programs" || href.startsWith("/trainee/program")) return "programs";
  if (href === "/curriculum") return "curriculum";
  if (href === "/training-materials" || href.startsWith("/trainee/materials")) return "materials";
  if (href === "/schedule" || href.startsWith("/trainee/schedule")) return "schedule";
  if (href === "/attendance" || href.startsWith("/trainee/attendance")) return "attendance";
  if (href === "/assessments" || href.startsWith("/trainee/assessments")) return "assessments";
  if (href === "/assessment-results") return "results";
  if (href === "/competencies") return "competencies";
  if (href === "/competency-evaluations" || href.startsWith("/trainee/competencies")) return "evaluations";
  if (href === "/onboarding-progress" || href.startsWith("/trainee/history")) return "progress";
  if (href === "/reports") return "reports";
  if (href === "/users") return "users";
  if (href === "/roles-permissions") return "roles";
  if (href === "/audit-logs") return "audit";
  if (href === "/settings") return "settings";
  if (href === "/notifications") return "notifications";
  if (href === "/profile") return "profile";

  return "dashboard";
}

function NavIcon({ href }: { href: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[iconKey(href)]}
    </svg>
  );
}

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
  const isTrainee = user?.role?.slug === "etc_trainee";

  const groups = isTrainee ? traineeGroups : adminGroups;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-black bg-ink transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[264px] lg:w-[68px]" : "w-[264px]"
        )}
      >
        <div className={cn("flex min-h-16 items-center gap-3 border-b border-white/10 px-4", collapsed && "lg:justify-center lg:px-2")}>
          <img
            src="/logo.png"
            alt="CDRRMD"
            className="h-8 w-8 shrink-0 rounded-md"
            aria-hidden="true"
          />
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <p className="truncate text-[13px] font-semibold tracking-tight text-white">CDRRMD DMS</p>
            <p className="truncate text-[11px] text-white/45">Onboarding Management</p>
          </div>
        </div>

        <nav className={cn("flex-1 space-y-5 overflow-y-auto px-2.5 py-4", collapsed && "lg:px-2")} aria-label="Primary navigation">
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.permission || can(item.permission));
            if (items.length === 0) return null;

            return (
              <div key={group.title}>
                <p className={cn("mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35", collapsed && "lg:hidden")}>{group.title}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/trainee/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={collapsed ? item.name : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 items-center gap-3 rounded-md px-2.5 text-[13px] transition-colors",
                          active ? "bg-white/[0.08] font-medium text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                          collapsed && "lg:justify-center lg:px-0"
                        )}
                      >
                        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />}
                        <span className={cn(active ? "text-brand" : "text-white/45")}>
                          <NavIcon href={item.href} />
                        </span>
                        <span className={cn("truncate", collapsed && "lg:hidden")}>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-2.5">
          <p className={cn("px-2 pt-1 text-[10px] text-white/30", collapsed && "lg:hidden")}>Butuan City CDRRMD</p>
        </div>
      </aside>
    </>
  );
}
