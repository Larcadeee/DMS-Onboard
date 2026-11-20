"use client";

import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge, Button, Card, ErrorState, PageHeader, PageLoading, ProgressBar } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface ProgressRow {
  enrollment_id: number;
  trainee_id: number;
  trainee: string;
  trainee_number: string;
  program: string;
  current_phase: string;
  progress: number;
  status: string;
  modules_completed: number;
  modules_total: number;
}

interface DashboardData {
  stats: Record<string, number>;
  distribution: Array<{ status: string; total: number }>;
  competency: Array<{ status: string; total: number }>;
  upcoming_sessions: Array<{ id: number; title: string; starts_at: string; location?: string }>;
  recent_activities: Array<{ id: number; action: string; description?: string; created_at: string; user?: { name: string } }>;
  trainee_progress: ProgressRow[];
}

function statusBar(status: string): string {
  const value = status.toLowerCase();
  if (["completed", "approved", "active"].includes(value)) return "bg-brand";
  if (["pending_review", "on_hold", "draft"].includes(value)) return "bg-amber-500";
  if (["cancelled", "rejected", "archived"].includes(value)) return "bg-red-400";
  return "bg-slate-400";
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/v1/dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Dashboard"
          description="Operational overview of the Emergency Telecommunicator onboarding program."
          breadcrumb="Overview"
          actions={<Link href="/onboarding-progress"><Button variant="secondary">View onboarding progress</Button></Link>}
        />

        {loading && <PageLoading label="Loading dashboard overview" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <section className="overflow-hidden rounded-lg border border-black bg-ink text-white">
              <div className="px-5 py-6 sm:px-7">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  <span className="h-px w-5 bg-brand" aria-hidden="true" />
                  Program overview
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Onboarding at a glance</h2>
                    <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/50">
                      Live training, evaluation and completion status across active onboarding programs.
                    </p>
                  </div>
                  <Link href="/trainees" className="text-xs font-medium text-white/60 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">
                    Manage trainees
                  </Link>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/10 pt-5 sm:grid-cols-4">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Total trainees</dt>
                    <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{data.stats.trainees_total ?? 0}</dd>
                    <p className="mt-0.5 text-[11px] text-white/40">{data.stats.trainees_active ?? 0} active</p>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Ongoing onboarding</dt>
                    <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{data.stats.enrollments_ongoing ?? 0}</dd>
                    <p className="mt-0.5 text-[11px] text-white/40">{data.stats.pending_review ?? 0} pending final review</p>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Completed</dt>
                    <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-brand">{data.stats.enrollments_completed ?? 0}</dd>
                    <p className="mt-0.5 text-[11px] text-white/40">Approved completions</p>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Active programs</dt>
                    <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{data.stats.programs_active ?? 0}</dd>
                    <p className="mt-0.5 text-[11px] text-white/40">{data.stats.programs_total ?? 0} total programs</p>
                  </div>
                </dl>
              </div>
            </section>

            <section className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-line">
              <div className="border-b border-line px-5 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Pending evaluations</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{data.stats.pending_assessments ?? 0}</p>
                <p className="mt-0.5 text-[11px] text-muted">Assessment attempts awaiting evaluation</p>
              </div>
              <div className="border-b border-line px-5 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Final reviews</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{data.stats.pending_review ?? 0}</p>
                <p className="mt-0.5 text-[11px] text-muted">Onboarding records awaiting approval</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Upcoming sessions</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{data.stats.upcoming_sessions ?? 0}</p>
                <p className="mt-0.5 text-[11px] text-muted">Scheduled training activities</p>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Onboarding status" description="Trainee distribution by enrollment status">
                <div className="space-y-3.5">
                  {data.distribution.length === 0 && <p className="text-sm text-muted">No enrollments yet.</p>}
                  {data.distribution.map((row) => {
                    const total = data.distribution.reduce((sum, item) => sum + Number(item.total), 0) || 1;
                    return (
                      <div key={row.status}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink-soft">{titleCase(row.status)}</span>
                          <span className="font-medium tabular-nums text-ink">{row.total}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${statusBar(row.status)}`} style={{ width: `${(Number(row.total) / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title="Upcoming activities" description="Next scheduled training sessions">
                <div className="divide-y divide-line">
                  {data.upcoming_sessions.length === 0 && <p className="text-sm text-muted">No upcoming sessions scheduled.</p>}
                  {data.upcoming_sessions.slice(0, 4).map((session) => (
                    <div key={session.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-[13px] font-medium text-ink">{session.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatDateTime(session.starts_at)} · {session.location ?? "Venue TBA"}</p>
                    </div>
                  ))}
                </div>
                <Link href="/schedule" className="mt-4 inline-flex text-xs font-medium text-brand-dark hover:underline">
                  View full schedule
                </Link>
              </Card>

              <Card title="Competency summary" description="Latest evaluation states">
                <div className="divide-y divide-line">
                  {data.competency.length === 0 && <p className="text-sm text-muted">No competency evaluations yet.</p>}
                  {data.competency.map((row) => (
                    <div key={row.status} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Badge status={row.status}>{titleCase(row.status)}</Badge>
                      <span className="text-sm font-semibold tabular-nums text-ink">{row.total}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Trainee progress overview" description="Latest onboarding progress across programs">
              <DataTable
                rows={data.trainee_progress}
                columns={[
                  {
                    key: "trainee",
                    label: "Trainee",
                    render: (row) => (
                      <div>
                        <Link href={`/trainees/${row.trainee_id}`} className="font-medium text-ink hover:text-brand-dark hover:underline">{row.trainee}</Link>
                        <p className="text-[11px] text-muted">{row.trainee_number}</p>
                      </div>
                    ),
                  },
                  { key: "program", label: "Program" },
                  { key: "current_phase", label: "Current phase", render: (row) => row.current_phase ?? "—" },
                  {
                    key: "progress",
                    label: "Progress",
                    className: "min-w-40",
                    render: (row) => <ProgressBar value={Number(row.progress)} />,
                  },
                  { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                  {
                    key: "actions",
                    label: "Action",
                    render: (row) => (
                      <Link href={`/trainees/${row.trainee_id}`} className="text-xs font-medium text-brand-dark hover:underline">View details</Link>
                    ),
                  },
                ]}
                emptyTitle="No onboarding progress yet"
                emptyDescription="Register a trainee and assign a program to start tracking progress."
              />
            </Card>

            <Card title="Recent activity" description="Latest recorded system activities">
              <div className="divide-y divide-line">
                {data.recent_activities.length === 0 && <p className="py-3 text-sm text-muted">No activity recorded yet.</p>}
                {data.recent_activities.map((activity) => (
                  <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[13px] text-ink-soft">{activity.description ?? titleCase(activity.action)}</p>
                      <p className="text-[11px] text-muted">{activity.user?.name ?? "System"} · {formatDate(activity.created_at)}</p>
                    </div>
                    <Badge status={activity.action.split(".")[0]}>{activity.action.split(".")[0]}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
