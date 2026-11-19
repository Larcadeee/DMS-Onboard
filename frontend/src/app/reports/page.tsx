"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { downloadFile, query } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { Badge, Button, Card, Input, PageHeader, ProgressBar, StatCard, Tabs } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface Overview {
  generated_at: string;
  trainees: { total: number; active: number };
  onboarding: { total: number; ongoing: number; completed: number; on_hold: number };
  attendance: { total: number; present: number; absent: number; late: number; excused: number };
  assessments: { attempts: number; passed: number; failed: number };
  competencies: { competent: number; validated: number; needs_improvement: number };
}

interface ProgramPerformance {
  id: number;
  code: string;
  name: string;
  status: string;
  trainees: number;
  completed: number;
  completion_rate: number;
  average_progress: number;
  attendance_rate: number;
  assessment_pass_rate: number;
}

interface Completion {
  id: number;
  enrollment_number: string;
  completed_at?: string;
  trainee?: { first_name: string; last_name: string; trainee_number: string };
  curriculum_version?: { program?: { name: string } };
  supervisor?: { name: string };
}

export default function ReportsPage() {
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = query({ date_from: from || undefined, date_to: to || undefined });
  const overview = useApi<Overview>(`/api/v1/reports/overview${filters}`);
  const performance = useApi<{ programs: ProgramPerformance[] }>("/api/v1/reports/program-performance");
  const completions = useApi<{ completions: Completion[] }>(`/api/v1/reports/completion${filters}`);

  async function exportCsv(type: string) {
    setExporting(true);

    try {
      await downloadFile(`/api/v1/reports/export${query({ type, date_from: from || undefined, date_to: to || undefined })}`, `cdrrmd-${type}-report.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Reports &amp; Analytics"
          description="Generate onboarding, attendance, assessment, competency and completion reports."
          breadcrumb="Reporting"
          actions={
            <>
              <Button variant="secondary" onClick={() => exportCsv("progress")} disabled={exporting}>Export Progress CSV</Button>
              <Button variant="secondary" onClick={() => exportCsv("attendance")} disabled={exporting}>Export Attendance CSV</Button>
            </>
          }
        />

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">To</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </label>
            {(from || to) && <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>}
            <p className="text-xs text-slate-400">Filters apply to overview and completion reports.</p>
          </div>
        </Card>

        <Tabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "programs", label: "Program Performance" },
            { value: "completions", label: "Completion Report" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Trainees" value={overview.data?.trainees.total ?? "—"} description={`${overview.data?.trainees.active ?? 0} active`} />
              <StatCard title="Ongoing Onboarding" value={overview.data?.onboarding.ongoing ?? "—"} tone="sky" description={`${overview.data?.onboarding.total ?? 0} total enrollments`} />
              <StatCard title="Completed Onboarding" value={overview.data?.onboarding.completed ?? "—"} tone="emerald" description={`${overview.data?.onboarding.on_hold ?? 0} on hold`} />
              <StatCard
                title="Attendance Rate"
                value={overview.data?.attendance.total ? `${Math.round((overview.data.attendance.present / overview.data.attendance.total) * 100)}%` : "—"}
                tone="violet"
                description={`${overview.data?.attendance.present ?? 0} present of ${overview.data?.attendance.total ?? 0}`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Attendance Breakdown">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Present</dt><dd className="font-medium text-emerald-600">{overview.data?.attendance.present ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Late</dt><dd className="font-medium text-sky-600">{overview.data?.attendance.late ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Excused</dt><dd className="font-medium text-amber-600">{overview.data?.attendance.excused ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Absent</dt><dd className="font-medium text-red-600">{overview.data?.attendance.absent ?? 0}</dd></div>
                </dl>
              </Card>

              <Card title="Assessment Results">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Total attempts</dt><dd className="font-medium">{overview.data?.assessments.attempts ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Passed</dt><dd className="font-medium text-emerald-600">{overview.data?.assessments.passed ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Failed</dt><dd className="font-medium text-red-600">{overview.data?.assessments.failed ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Pass rate</dt><dd className="font-medium">{overview.data?.assessments.attempts ? `${Math.round(((overview.data.assessments.passed) / overview.data.assessments.attempts) * 100)}%` : "—"}</dd></div>
                </dl>
              </Card>

              <Card title="Competency Status">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Competent</dt><dd className="font-medium text-emerald-600">{overview.data?.competencies.competent ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Validated</dt><dd className="font-medium text-sky-600">{overview.data?.competencies.validated ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Needs improvement</dt><dd className="font-medium text-amber-600">{overview.data?.competencies.needs_improvement ?? 0}</dd></div>
                </dl>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => exportCsv("competency")}>Export competencies</Button>
                </div>
              </Card>
            </div>

            {overview.data?.generated_at && <p className="text-xs text-slate-400">Generated {formatDateTime(overview.data.generated_at)}</p>}
          </div>
        )}

        {tab === "programs" && (
          <Card title="Program Performance" description="Aggregated onboarding outcomes per program.">
            <DataTable
              rows={performance.data?.programs ?? []}
              loading={performance.loading}
              error={performance.error}
              onRetry={performance.refetch}
              columns={[
                { key: "code", label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
                { key: "name", label: "Program" },
                { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                { key: "trainees", label: "Trainees" },
                { key: "completed", label: "Completed" },
                { key: "completion_rate", label: "Completion Rate", render: (row) => `${row.completion_rate}%` },
                { key: "average_progress", label: "Average Progress", className: "min-w-36", render: (row) => <ProgressBar value={Number(row.average_progress)} /> },
                { key: "attendance_rate", label: "Attendance", render: (row) => `${row.attendance_rate}%` },
                { key: "assessment_pass_rate", label: "Assessment Pass", render: (row) => `${row.assessment_pass_rate}%` },
              ]}
              emptyTitle="No program data"
            />
          </Card>
        )}

        {tab === "completions" && (
          <Card
            title="Onboarding Completion Report"
            description="Trainees who have completed onboarding."
            actions={<Button size="sm" variant="secondary" onClick={() => exportCsv("completion")}>Export CSV</Button>}
          >
            <DataTable
              rows={completions.data?.completions ?? []}
              loading={completions.loading}
              error={completions.error}
              onRetry={completions.refetch}
              columns={[
                { key: "trainee", label: "Trainee", render: (row) => <div><p className="font-medium">{row.trainee ? `${row.trainee.first_name} ${row.trainee.last_name}` : "—"}</p><p className="text-xs text-slate-400">{row.trainee?.trainee_number}</p></div> },
                { key: "program", label: "Program", render: (row) => row.curriculum_version?.program?.name ?? "—" },
                { key: "enrollment_number", label: "Enrollment No." },
                { key: "supervisor", label: "Approved by", render: (row) => row.supervisor?.name ?? "—" },
                { key: "completed_at", label: "Completed", render: (row) => formatDate(row.completed_at) },
              ]}
              emptyTitle="No completed onboarding records"
              emptyDescription="Completed enrollments will appear here after final approval."
            />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
