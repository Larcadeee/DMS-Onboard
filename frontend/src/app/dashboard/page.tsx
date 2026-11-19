"use client";

import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge, Card, ErrorState, LoadingSkeleton, PageHeader, ProgressBar, StatCard } from "@/components/ui/Primitives";
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

export default function DashboardPage() {
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/v1/dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Dashboard"
          description="Operational overview of the Emergency Telecommunicator onboarding program."
          breadcrumb="Overview"
        />

        {loading && <LoadingSkeleton rows={6} />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Total Trainees" value={data.stats.trainees_total} description={`${data.stats.trainees_active} active`} />
              <StatCard title="Ongoing Onboarding" value={data.stats.enrollments_ongoing} description={`${data.stats.pending_review} pending final review`} tone="sky" />
              <StatCard title="Completed Onboarding" value={data.stats.enrollments_completed} description="Approved completions" tone="emerald" />
              <StatCard title="Active Programs" value={data.stats.programs_active} description={`${data.stats.programs_total} total programs`} />
              <StatCard title="Pending Evaluations" value={data.stats.pending_assessments} description="Assessment attempts awaiting evaluation" tone="amber" />
              <StatCard title="Upcoming Sessions" value={data.stats.upcoming_sessions} description="Scheduled training activities" tone="violet" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Onboarding Status" description="Trainee distribution by enrollment status" className="lg:col-span-1">
                <div className="space-y-3">
                  {data.distribution.length === 0 && <p className="text-sm text-slate-500">No enrollments yet.</p>}
                  {data.distribution.map((row) => {
                    const total = data.distribution.reduce((sum, item) => sum + Number(item.total), 0) || 1;
                    return (
                      <div key={row.status}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="capitalize text-slate-600">{titleCase(row.status)}</span>
                          <span className="font-medium tabular-nums text-slate-900">{row.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-slate-800" style={{ width: `${(Number(row.total) / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title="Upcoming Activities" description="Next scheduled training sessions">
                <div className="space-y-3">
                  {data.upcoming_sessions.length === 0 && <p className="text-sm text-slate-500">No upcoming sessions scheduled.</p>}
                  {data.upcoming_sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-slate-800">{session.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(session.starts_at)} · {session.location ?? "Venue TBA"}</p>
                    </div>
                  ))}
                  <Link href="/schedule" className="inline-block text-xs font-medium text-slate-600 underline">View full schedule</Link>
                </div>
              </Card>

              <Card title="Competency Summary" description="Latest evaluation states">
                <div className="space-y-2">
                  {data.competency.length === 0 && <p className="text-sm text-slate-500">No competency evaluations yet.</p>}
                  {data.competency.map((row) => (
                    <div key={row.status} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <Badge status={row.status}>{titleCase(row.status)}</Badge>
                      <span className="text-sm font-semibold tabular-nums text-slate-800">{row.total}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Trainee Progress Overview" description="Latest onboarding progress across programs">
              <DataTable
                rows={data.trainee_progress}
                columns={[
                  {
                    key: "trainee",
                    label: "Trainee",
                    render: (row) => (
                      <div>
                        <Link href={`/trainees/${row.trainee_id}`} className="font-medium text-slate-900 hover:underline">{row.trainee}</Link>
                        <p className="text-xs text-slate-400">{row.trainee_number}</p>
                      </div>
                    ),
                  },
                  { key: "program", label: "Program" },
                  { key: "current_phase", label: "Current Phase", render: (row) => row.current_phase ?? "—" },
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
                      <Link href={`/trainees/${row.trainee_id}`} className="text-xs font-medium text-slate-700 underline">View details</Link>
                    ),
                  },
                ]}
                emptyTitle="No onboarding progress yet"
                emptyDescription="Register a trainee and assign a program to start tracking progress."
              />
            </Card>

            <Card title="Recent Activities" description="Latest recorded system activities">
              <div className="divide-y">
                {data.recent_activities.length === 0 && <p className="py-4 text-sm text-slate-500">No activity recorded yet.</p>}
                {data.recent_activities.map((activity) => (
                  <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm text-slate-800">{activity.description ?? titleCase(activity.action)}</p>
                      <p className="text-xs text-slate-400">{activity.user?.name ?? "System"} · {formatDate(activity.created_at)}</p>
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
