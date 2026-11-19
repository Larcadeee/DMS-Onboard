"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Button, Card, DetailRow, Field, Modal, PageHeader, Pagination, ProgressBar, SearchInput, Select, StatCard, Textarea } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface ProgressRow {
  enrollment_id: number;
  trainee_id: number;
  trainee: string;
  trainee_number: string;
  program: string;
  current_phase?: string;
  modules_completed: number;
  modules_total: number;
  attendance_rate: number;
  assessments_passed: number;
  assessments_total: number;
  competencies_validated: number;
  competencies_total: number;
  progress: number;
  status: string;
  outstanding: string[];
  completed_at?: string;
}

interface ProgressDetail {
  progress: ProgressRow;
  ready_for_approval: boolean;
  enrollment: { id: number; enrollment_number: string; trainer?: { name: string }; supervisor?: { name: string } };
}

export default function OnboardingProgressPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [acting, setActing] = useState(false);

  const debounced = useDebounced(search);
  const list = useApi<Paginated<ProgressRow>>(`/api/v1/onboarding-progress${query({ search: debounced, status, page })}`);
  const summary = useApi<Record<string, number>>("/api/v1/onboarding-progress/summary");
  const detail = useApi<ProgressDetail>(selected ? `/api/v1/onboarding-progress/${selected}` : null);

  async function act(action: "submit" | "approve" | "return") {
    if (!selected) return;
    setActing(true);

    try {
      await api.post(`/api/v1/onboarding-progress/${selected}/${action}`, action === "return" ? { remarks } : { remarks: remarks || undefined });
      toast.notify(
        action === "approve" ? "Onboarding completion approved." : action === "return" ? "Returned for additional training." : "Submitted for final review."
      );
      setSelected(null);
      setRemarks("");
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update onboarding progress.", "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Onboarding Progress Monitoring"
          description="Monitor overall completion, outstanding requirements and final onboarding readiness."
          breadcrumb="Evaluation and Monitoring"
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total Enrollments" value={summary.data?.total ?? "—"} />
          <StatCard title="In Progress" value={summary.data?.in_progress ?? "—"} tone="sky" />
          <StatCard title="Completed" value={summary.data?.completed ?? "—"} tone="emerald" />
          <StatCard title="On Hold" value={summary.data?.on_hold ?? "—"} tone="amber" />
          <StatCard title="Pending Final Review" value={summary.data?.pending_review ?? "—"} tone="violet" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search trainee name or employee no..." />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48">
              <option value="">All statuses</option>
              {["enrolled", "ongoing", "pending_review", "on_hold", "completed", "transferred"].map((value) => (
                <option key={value} value={value}>{titleCase(value)}</option>
              ))}
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "trainee", label: "Trainee", render: (row) => <div><p className="font-medium">{row.trainee}</p><p className="text-xs text-slate-400">{row.trainee_number}</p></div> },
              { key: "program", label: "Program", render: (row) => row.program ?? "—" },
              { key: "current_phase", label: "Current Phase", render: (row) => row.current_phase ?? "—" },
              { key: "modules", label: "Modules", render: (row) => `${row.modules_completed}/${row.modules_total}` },
              { key: "attendance", label: "Attendance", render: (row) => `${row.attendance_rate}%` },
              { key: "assessments", label: "Assessments", render: (row) => `${row.assessments_passed}/${row.assessments_total}` },
              { key: "competencies", label: "Validated", render: (row) => `${row.competencies_validated}/${row.competencies_total}` },
              { key: "progress", label: "Overall", className: "min-w-36", render: (row) => <ProgressBar value={Number(row.progress)} /> },
              { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
              { key: "actions", label: "Actions", render: (row) => <Button size="sm" variant="secondary" onClick={() => { setSelected(row.enrollment_id); setRemarks(""); }}>Review</Button> },
            ]}
            emptyTitle="No onboarding records"
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={Boolean(selected)} title="Final Onboarding Review" onClose={() => setSelected(null)} wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            {detail.data && detail.data.progress.status !== "completed" && can("approvals.supervisor") && (
              <Button variant="secondary" onClick={() => act("submit")} disabled={acting}>Submit for review</Button>
            )}
            {detail.data && detail.data.progress.status !== "completed" && can("approvals.final") && (
              <>
                <Button variant="danger" onClick={() => act("return")} disabled={acting || !remarks}>Return for training</Button>
                <Button onClick={() => act("approve")} disabled={acting}>Approve completion</Button>
              </>
            )}
          </>
        }
      >
        {detail.loading && <p className="text-sm text-slate-500">Loading progress...</p>}
        {detail.data && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{detail.data.progress.trainee} · {detail.data.progress.trainee_number}</p>
              <p className="text-xs text-slate-500">{detail.data.progress.program} · Enrollment {detail.data.enrollment.enrollment_number}</p>
            </div>

            <dl className="divide-y">
              <DetailRow label="Current phase" value={detail.data.progress.current_phase ?? "—"} />
              <DetailRow label="Modules completed" value={`${detail.data.progress.modules_completed} / ${detail.data.progress.modules_total}`} />
              <DetailRow label="Attendance rate" value={`${detail.data.progress.attendance_rate}%`} />
              <DetailRow label="Assessments passed" value={`${detail.data.progress.assessments_passed} / ${detail.data.progress.assessments_total}`} />
              <DetailRow label="Competencies validated" value={`${detail.data.progress.competencies_validated} / ${detail.data.progress.competencies_total}`} />
              <DetailRow label="Overall progress" value={<ProgressBar value={detail.data.progress.progress} />} />
              <DetailRow label="Trainer" value={detail.data.enrollment.trainer?.name ?? "Unassigned"} />
              <DetailRow label="Supervisor" value={detail.data.enrollment.supervisor?.name ?? "Unassigned"} />
              <DetailRow label="Ready for approval" value={detail.data.ready_for_approval ? "Yes" : "No"} />
              {detail.data.progress.completed_at && <DetailRow label="Approved on" value={formatDate(detail.data.progress.completed_at)} />}
            </dl>

            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium text-slate-800">Outstanding requirements</p>
              {detail.data.progress.outstanding.length ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                  {detail.data.progress.outstanding.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-emerald-600">All mandatory requirements satisfied.</p>
              )}
            </div>

            {can("approvals.final") && (
              <Field label="Review remarks" hint="Required when returning for additional training.">
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
