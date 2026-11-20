"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoading, ProgressBar } from "@/components/ui/Primitives";

interface HistoryItem {
  enrollment_id: number;
  program?: string;
  status: string;
  modules_completed: number;
  modules_total: number;
  attendance_rate: number;
  assessments_passed: number;
  assessments_total: number;
  competencies_validated: number;
  competencies_total: number;
  progress: number;
  completed_at?: string;
  enrolled_at?: string;
}

export default function TraineeHistoryPage() {
  const { data, loading, error, refetch } = useApi<{ history: HistoryItem[] }>("/api/v1/my/history");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Training History"
          description="All onboarding enrollments linked to your trainee record."
          breadcrumb="My Onboarding"
        />

        {loading && <PageLoading label="Loading training history" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && data.history.length === 0 && <Card><EmptyState title="No training history" description="Your onboarding enrollments will appear here." /></Card>}

        <div className="space-y-4">
          {data?.history.map((item) => (
            <Card key={item.enrollment_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.program ?? "Onboarding Program"}</p>
                  <p className="text-xs text-slate-500">
                    Enrollment #{item.enrollment_id}
                    {item.enrolled_at ? ` · Enrolled ${formatDate(item.enrolled_at)}` : ""}
                    {item.completed_at ? ` · Completed ${formatDate(item.completed_at)}` : ""}
                  </p>
                </div>
                <Badge status={item.status}>{titleCase(item.status)}</Badge>
              </div>

              <div className="mt-4"><ProgressBar value={Number(item.progress)} /></div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-slate-400">Modules</dt><dd className="font-medium">{item.modules_completed}/{item.modules_total}</dd></div>
                <div><dt className="text-xs text-slate-400">Attendance</dt><dd className="font-medium">{item.attendance_rate}%</dd></div>
                <div><dt className="text-xs text-slate-400">Assessments</dt><dd className="font-medium">{item.assessments_passed}/{item.assessments_total}</dd></div>
                <div><dt className="text-xs text-slate-400">Competencies</dt><dd className="font-medium">{item.competencies_validated}/{item.competencies_total}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
