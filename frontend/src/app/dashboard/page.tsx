"use client";

import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge, Button, Card, ErrorState, PageHeader, PageLoading, ProgressBar } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";
import { DistributionChart } from "@/components/ui/DistributionChart";

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
          actions={<Link href="/onboarding-progress"><Button variant="secondary">View onboarding progress</Button></Link>}
        />

        {loading && <PageLoading label="Loading dashboard overview" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total trainees", data.stats.trainees_total ?? 0, `${data.stats.trainees_active ?? 0} active`],
                ["Ongoing onboarding", data.stats.enrollments_ongoing ?? 0, `${data.stats.pending_review ?? 0} pending final review`],
                ["Completed", data.stats.enrollments_completed ?? 0, "Approved completions"],
                ["Active programs", data.stats.programs_active ?? 0, `${data.stats.programs_total ?? 0} total programs`],
              ].map(([title, value, description]) => (
                <Card key={String(title)} className="content-enter">
                  <p className="text-xs font-medium text-muted">{title}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
                  <p className="mt-1 text-xs text-muted">{description}</p>
                </Card>
              ))}
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
                <DistributionChart
                  type="donut"
                  data={data.distribution.map((row) => ({ label: titleCase(row.status), value: Number(row.total) }))}
                />
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
                <DistributionChart
                  type="bar"
                  color="amber"
                  data={data.competency.map((row) => ({ label: titleCase(row.status), value: Number(row.total) }))}
                />
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
