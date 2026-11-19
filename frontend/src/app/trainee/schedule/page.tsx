"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, formatTime, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, LoadingSkeleton, PageHeader, StatCard } from "@/components/ui/Primitives";

interface Session {
  id: number;
  title: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  status: string;
  training_module?: { title: string; curriculum_phase?: { name: string } };
}

interface Attendance {
  id: number;
  training_session_id: number;
  attendance_status: string;
  check_in_at?: string;
  check_out_at?: string;
}

export default function TraineeSchedulePage() {
  const { data, loading, error } = useApi<{ sessions: Session[]; attendance: Attendance[] }>("/api/v1/my/schedule");

  const attendanceBySession = new Map((data?.attendance ?? []).map((record) => [record.training_session_id, record]));
  const [now] = useState(() => Date.now());
  const upcoming = (data?.sessions ?? []).filter((session) => new Date(session.starts_at).getTime() >= now);
  const past = (data?.sessions ?? []).filter((session) => new Date(session.starts_at).getTime() < now).reverse();

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Training Schedule"
          description="Sessions assigned to your onboarding enrollment."
          breadcrumb="My Onboarding"
        />

        {loading && <LoadingSkeleton rows={4} />}
        {error && <Card><p className="text-sm text-red-600">{error}</p></Card>}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Upcoming Sessions" value={upcoming.length} tone="sky" />
              <StatCard title="Completed Sessions" value={past.length} tone="emerald" />
              <StatCard title="Next Session" value={upcoming[0] ? formatDate(upcoming[0].starts_at) : "—"} />
            </div>

            <Card title="Upcoming">
              {upcoming.length === 0 && <EmptyState title="No upcoming sessions" description="Your trainer will schedule sessions as your onboarding progresses." />}
              <ul className="divide-y">
                {upcoming.map((session) => (
                  <li key={session.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{session.title}</p>
                      <p className="text-sm text-slate-600">{formatDateTime(session.starts_at)}{session.ends_at ? ` – ${formatTime(session.ends_at)}` : ""}</p>
                      <p className="text-xs text-slate-400">
                        {[session.training_module?.curriculum_phase?.name, session.training_module?.title, session.location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge status={session.status}>{titleCase(session.status)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Past Sessions">
              {past.length === 0 && <EmptyState title="No past sessions" />}
              <ul className="divide-y">
                {past.map((session) => {
                  const record = attendanceBySession.get(session.id);
                  return (
                    <li key={session.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{session.title}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(session.starts_at)}{session.ends_at ? ` – ${formatTime(session.ends_at)}` : ""}</p>
                        <p className="text-xs text-slate-400">{session.location ?? "—"}</p>
                      </div>
                      <Badge status={record?.attendance_status ?? "unmarked"}>{record ? titleCase(record.attendance_status) : "Not marked"}</Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
