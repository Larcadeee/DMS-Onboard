"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { formatDateTime, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, LoadingSkeleton, PageHeader, StatCard } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface Record {
  id: number;
  attendance_status: string;
  check_in_at?: string;
  check_out_at?: string;
  remarks?: string;
  training_session?: { title: string; starts_at: string; ends_at?: string; location?: string; training_module?: { title: string } };
}

export default function TraineeAttendancePage() {
  const { data, loading, error, refetch } = useApi<{
    attendance: Record[];
    summary: { total: number; present: number; absent: number; late: number; excused: number };
  }>("/api/v1/my/attendance");

  const rate = data?.summary.total ? Math.round(((data.summary.present + data.summary.late) / data.summary.total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Attendance"
          description="Attendance records for sessions in your onboarding program."
          breadcrumb="My Onboarding"
        />

        {loading && <LoadingSkeleton rows={4} />}
        {error && <Card><p className="text-sm text-red-600">{error}</p></Card>}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard title="Attendance Rate" value={`${rate}%`} />
              <StatCard title="Present" value={data.summary.present} tone="emerald" />
              <StatCard title="Late" value={data.summary.late} tone="sky" />
              <StatCard title="Excused" value={data.summary.excused} tone="amber" />
              <StatCard title="Absent" value={data.summary.absent} tone="red" />
            </div>

            <Card title="Attendance Records">
              {data.attendance.length === 0 && <EmptyState title="No attendance records" description="Records appear after your trainer marks attendance for a session." />}
              <DataTable
                rows={data.attendance}
                loading={false}
                onRetry={refetch}
                columns={[
                  { key: "session", label: "Session", render: (row) => <div><p className="font-medium">{row.training_session?.title ?? "—"}</p><p className="text-xs text-slate-400">{row.training_session?.training_module?.title}</p></div> },
                  { key: "starts_at", label: "Date", render: (row) => formatDateTime(row.training_session?.starts_at) },
                  { key: "location", label: "Location", render: (row) => row.training_session?.location ?? "—" },
                  { key: "check_in", label: "Check In", render: (row) => row.check_in_at ? formatDateTime(row.check_in_at) : "—" },
                  { key: "check_out", label: "Check Out", render: (row) => row.check_out_at ? formatDateTime(row.check_out_at) : "—" },
                  { key: "status", label: "Status", render: (row) => <Badge status={row.attendance_status}>{titleCase(row.attendance_status)}</Badge> },
                  { key: "remarks", label: "Remarks", render: (row) => row.remarks ?? "—" },
                ]}
              />
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
