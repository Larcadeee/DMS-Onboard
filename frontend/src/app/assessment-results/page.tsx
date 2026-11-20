"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, titleCase } from "@/lib/format";
import { Badge, Button, Card, ErrorState, Field, Input, LoadingSkeleton, Modal, PageHeader, Pagination, SearchInput, Select, StatCard, Textarea } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface AttemptRow {
  id: number;
  attempt_number: number;
  score?: string | number | null;
  status: string;
  result?: string;
  trainee?: string;
  assessment_title?: string;
  submitted_at?: string;
  feedback?: string;
  assessment?: {
    id: number;
    title: string;
    assessment_type: string;
    passing_score: string;
    release_results: boolean;
  };
  evaluation?: unknown;
}

interface AttemptDetail {
  attempt: AttemptRow & {
    enrollment?: { trainee?: { first_name: string; last_name: string; trainee_number: string }; trainer?: { name: string } };
    assessment: { title: string; passing_score: string; total_points: string; questions: Array<{ id: number; question_text: string; points: string; question_type: string }> };
    responses: Array<{ id: number; answer?: { value?: string }; awarded_points?: string; evaluator_feedback?: string; question?: { id: number; question_text: string; points: string } }>;
    feedback?: string;
  };
}

export default function AssessmentResultsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [page, setPage] = useState(1);
  const [grading, setGrading] = useState<AttemptDetail["attempt"] | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("assessment") : null;
    if (requested) setAssessmentId(requested);
  }, []);

  const list = useApi<Paginated<AttemptRow>>(`/api/v1/assessment-attempts${query({ search, status, result, assessment_id: assessmentId, page })}`);
  const summary = useApi<Record<string, number>>("/api/v1/assessment-attempts/summary");
  const detail = useApi<AttemptDetail>(viewing ? `/api/v1/assessment-attempts/${viewing}` : null);

  useEffect(() => {
    if (!detail.data) return;
    setScore(String(detail.data.attempt.score ?? ""));
    setFeedback(detail.data.attempt.feedback ?? "");
    setGrading(detail.data.attempt);
  }, [detail.data]);

  async function grade() {
    if (!grading) return;
    setSaving(true);

    try {
      await api.post(`/api/v1/assessment-attempts/${grading.id}/grade`, {
        score: Number(score),
        feedback,
        responses: detail.data?.attempt.responses.map((response) => ({
          id: response.id,
          awarded_points: Number(response.awarded_points ?? 0),
          evaluator_feedback: response.evaluator_feedback ?? null,
        })),
      });
      toast.notify("Assessment attempt evaluated.");
      setGrading(null);
      setViewing(null);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to evaluate attempt.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function release(assessmentIdValue: number) {
    try {
      await api.post(`/api/v1/assessments/${assessmentIdValue}/release`);
      toast.notify("Results released to trainees.");
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to release results.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Assessment Results and Evaluation"
          description="Review submitted attempts, record scores and release results to trainees."
          breadcrumb="Evaluation and Monitoring"
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard loading={summary.loading} title="Total Attempts" value={summary.data?.total ?? "—"} />
          <StatCard loading={summary.loading} title="Passed" value={summary.data?.passed ?? "—"} tone="accent" />
          <StatCard loading={summary.loading} title="Failed" value={summary.data?.failed ?? "—"} tone="danger" />
          <StatCard loading={summary.loading} title="Pending Evaluation" value={summary.data?.pending ?? "—"} tone="warning" />
          <StatCard loading={summary.loading} title="Results Unreleased" value={summary.data?.unreleased ?? "—"} tone="default" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search assessment..." />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
              <option value="">All statuses</option>
              {["in_progress", "submitted", "evaluated"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
            <Select value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className="w-40">
              <option value="">All results</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "trainee", label: "Trainee", render: (row) => row.trainee ?? "—" },
              { key: "assessment", label: "Assessment", render: (row) => row.assessment?.title ?? row.assessment_title ?? "—" },
              { key: "type", label: "Type", render: (row) => titleCase(row.assessment?.assessment_type) },
              { key: "attempt", label: "Attempt", render: (row) => row.attempt_number },
              { key: "score", label: "Score", render: (row) => row.score ?? "—" },
              { key: "passing", label: "Passing", render: (row) => row.assessment?.passing_score ?? "—" },
              { key: "result", label: "Result", render: (row) => <Badge status={row.result}>{titleCase(row.result ?? "pending")}</Badge> },
              { key: "submitted", label: "Submitted", render: (row) => formatDateTime(row.submitted_at) },
              { key: "release", label: "Released", render: (row) => row.assessment?.release_results ? "Yes" : "No" },
              { key: "actions", label: "Actions", render: (row) => <Button size="sm" variant="secondary" onClick={() => setViewing(row.id)}>Review</Button> },
            ]}
            emptyTitle="No assessment attempts"
          />

          <div className="mt-4 border-t border-line pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={Boolean(viewing)} title="Attempt Evaluation" onClose={() => { setViewing(null); setGrading(null); }} wide
        footer={
          <>
            <Button variant="secondary" onClick={() => { setViewing(null); setGrading(null); }}>Close</Button>
            {grading?.assessment && <Button variant="secondary" onClick={() => release(grading.assessment.id)}>Release results</Button>}
            {can("assessments.evaluate") && <Button onClick={grade} loading={saving}>{saving ? "Saving evaluation" : "Save evaluation"}</Button>}
          </>
        }
      >
        {detail.loading && <LoadingSkeleton rows={5} />}
        {detail.error && <ErrorState message={detail.error} onRetry={detail.refetch} />}
        {detail.data && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{detail.data.attempt.assessment.title}</p>
              <p className="text-xs text-slate-500">
                {detail.data.attempt.enrollment?.trainee?.first_name} {detail.data.attempt.enrollment?.trainee?.last_name} ·
                Attempt {detail.data.attempt.attempt_number} · {titleCase(detail.data.attempt.status)}
              </p>
            </div>

            <div className="space-y-2">
              {detail.data.attempt.responses.map((response, index) => (
                <div key={response.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-slate-800">{index + 1}. {response.question?.question_text}</p>
                  <p className="mt-1 text-sm text-slate-600">Answer: {response.answer?.value ?? "—"}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Field label={`Awarded points (max ${response.question?.points ?? "—"})`}>
                      <Input type="number" min={0} value={String(response.awarded_points ?? "")} disabled />
                    </Field>
                    <Field label="Evaluator feedback">
                      <Input value={response.evaluator_feedback ?? ""} disabled />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Final Score" required hint={`Passing score: ${detail.data.attempt.assessment.passing_score} of ${detail.data.attempt.assessment.total_points}`}>
                <Input type="number" min={0} value={score} onChange={(e) => setScore(e.target.value)} />
              </Field>
              <Field label="Evaluator Remarks">
                <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
