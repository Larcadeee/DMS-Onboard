"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoading, ProgressBar } from "@/components/ui/Primitives";
import { DistributionChart } from "@/components/ui/DistributionChart";

interface PortalDashboard {
  trainee: { first_name: string; last_name: string; trainee_number: string };
  enrollment: { enrollment_number: string; status: string; curriculum_version?: { program?: { name: string } } };
  progress: {
    progress: number;
    modules_completed: number;
    modules_total: number;
    attendance_rate: number;
    assessments_passed: number;
    assessments_total: number;
    competencies_validated: number;
    competencies_total: number;
    outstanding: string[];
    current_phase?: string;
  };
  upcoming_sessions: Array<{ id: number; title: string; starts_at: string; ends_at?: string; location?: string }>;
  recent_attendance: Array<{ id: number; attendance_status: string; updated_at: string; training_session?: { title: string; starts_at: string } }>;
  released_results: Array<{ id: number; score?: number; attempt_number: number; assessment?: { title: string; assessment_type: string; passing_score: number } }>;
  competencies: Array<{ id: number; status: string; rating?: number; updated_at: string; competency?: { name: string; code: string } }>;
}

export default function TraineeDashboardPage() {
  const { data, loading, error, refetch } = useApi<PortalDashboard>("/api/v1/my/dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title={data ? `Welcome, ${data.trainee.first_name}` : "My Dashboard"}
          description={data ? `${data.enrollment.curriculum_version?.program?.name ?? "Onboarding"} · ${data.enrollment.enrollment_number}` : "Your onboarding overview."}
          breadcrumb="My Onboarding"
          actions={data ? <Badge status={data.enrollment.status}>{titleCase(data.enrollment.status)}</Badge> : undefined}
        />

        {loading && <PageLoading label="Loading your dashboard" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <section className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-3 lg:grid-cols-5 sm:divide-x sm:divide-line">
              <div className="border-b border-line px-4 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Overall progress</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-brand-dark">{Math.round(data.progress.progress)}%</p>
              </div>
              <div className="border-b border-line px-4 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Modules</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{data.progress.modules_completed}/{data.progress.modules_total}</p>
              </div>
              <div className="border-b border-line px-4 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Attendance</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{data.progress.attendance_rate}%</p>
              </div>
              <div className="border-b border-line px-4 py-4 sm:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Assessments</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{data.progress.assessments_passed}/{data.progress.assessments_total}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Competencies</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{data.progress.competencies_validated}/{data.progress.competencies_total}</p>
              </div>
            </section>

            <Card title="Onboarding Progress" description={data.progress.current_phase ? `Current phase: ${data.progress.current_phase}` : undefined}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <DistributionChart
                  type="bar"
                  data={[
                    { label: "Modules", value: data.progress.modules_completed },
                    { label: "Assessments passed", value: data.progress.assessments_passed },
                    { label: "Competencies validated", value: data.progress.competencies_validated },
                  ]}
                />
                <div className="rounded-lg border border-line px-4 py-5">
                  <p className="text-xs font-medium text-muted">Overall progress</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{Math.round(data.progress.progress)}%</p>
                  <ProgressBar value={data.progress.progress} />
                </div>
              </div>
              {data.progress.outstanding.length > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">Outstanding requirements</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                    {data.progress.outstanding.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-brand-dark">All requirements are complete.</p>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Upcoming Sessions" actions={<Link href="/trainee/schedule" className="text-xs font-medium text-brand-dark hover:underline">View schedule</Link>}>
                {data.upcoming_sessions.length === 0 && <EmptyState title="No upcoming sessions" />}
                <ul className="divide-y">
                  {data.upcoming_sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{session.title}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(session.starts_at)} · {session.location ?? "TBA"}</p>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(session.starts_at)}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Recent Attendance" actions={<Link href="/trainee/attendance" className="text-xs font-medium text-brand-dark hover:underline">View attendance</Link>}>
                {data.recent_attendance.length === 0 && <EmptyState title="No attendance records yet" />}
                <ul className="divide-y">
                  {data.recent_attendance.map((record) => (
                    <li key={record.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{record.training_session?.title ?? "Session"}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(record.training_session?.starts_at)}</p>
                      </div>
                      <Badge status={record.attendance_status}>{titleCase(record.attendance_status)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Released Assessment Results" actions={<Link href="/trainee/assessments" className="text-xs font-medium text-brand-dark hover:underline">View assessments</Link>}>
                {data.released_results.length === 0 && <EmptyState title="No released results" description="Results appear after your trainer releases them." />}
                <ul className="divide-y">
                  {data.released_results.map((result) => (
                    <li key={result.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{result.assessment?.title}</p>
                        <p className="text-xs text-slate-500">Attempt {result.attempt_number} · Passing {result.assessment?.passing_score}</p>
                      </div>
                      <span className="text-sm font-semibold">{result.score ?? "Pending"}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Competency Feedback" actions={<Link href="/trainee/competencies" className="text-xs font-medium text-brand-dark hover:underline">View competencies</Link>}>
                {data.competencies.length === 0 && <EmptyState title="No competency evaluations yet" />}
                <ul className="divide-y">
                  {data.competencies.map((evaluation) => (
                    <li key={evaluation.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{evaluation.competency?.name}</p>
                        <p className="text-xs text-slate-500">{evaluation.competency?.code} · {formatDate(evaluation.updated_at)}</p>
                      </div>
                      <Badge status={evaluation.status}>{titleCase(evaluation.status)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
