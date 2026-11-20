"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, StatCard, Textarea } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface EvaluationRow {
  id: number;
  status: string;
  rating?: number;
  feedback?: string;
  strengths?: string;
  improvement_plan?: string;
  evaluated_at?: string;
  validated_at?: string;
  trainee?: string;
  competency_name?: string;
  program?: string;
  evaluation_number: number;
  enrollment?: { trainee?: { trainee_number: string } };
  competency?: { code?: string; category?: string };
  evaluator?: { name: string };
  validator?: { name: string };
}

export default function CompetencyEvaluationsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canEvaluate = can("competencies.evaluate");
  const canValidate = can("competencies.validate");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    enrollment_id: "",
    module_competency_id: "",
    status: "in_progress",
    rating: "3",
    evidence: "",
    feedback: "",
    strengths: "",
    improvement_plan: "",
  });

  const debounced = useDebounced(search);
  const list = useApi<Paginated<EvaluationRow>>(`/api/v1/competency-evaluations${query({ search: debounced, status, page })}`);
  const summary = useApi<Array<{ status: string; total: number }>>("/api/v1/competency-evaluations/summary");
  const trainees = useApi<Paginated<{ id: number; name: string; enrollment_id?: number; trainee_number: string }>>("/api/v1/trainees?per_page=100");
  const competencies = useApi<Array<{ id: number; code: string; name: string }>>("/api/v1/lookups/competencies");

  function summaryValue(key: string): number {
    return summary.data?.find((row) => row.status === key)?.total ?? 0;
  }

  function openCreate() {
    setForm({ enrollment_id: "", module_competency_id: "", status: "in_progress", rating: "3", evidence: "", feedback: "", strengths: "", improvement_plan: "" });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/api/v1/competency-evaluations", {
        enrollment_id: Number(form.enrollment_id),
        module_competency_id: Number(form.module_competency_id),
        status: form.status,
        rating: form.rating ? Number(form.rating) : null,
        evidence: form.evidence || null,
        feedback: form.feedback || null,
        strengths: form.strengths || null,
        improvement_plan: form.improvement_plan || null,
      });
      toast.notify("Competency evaluation recorded.");
      setOpen(false);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save evaluation.");
    } finally {
      setSaving(false);
    }
  }

  async function validate(row: EvaluationRow) {
    try {
      await api.post(`/api/v1/competency-evaluations/${row.id}/validate`);
      toast.notify("Competency validated.");
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to validate competency.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Trainee Competency Evaluation"
          description="Record competency observations and validate demonstrated competence."
          breadcrumb="Evaluation and Monitoring"
          actions={canEvaluate ? <Button onClick={openCreate}>Record Evaluation</Button> : undefined}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard loading={summary.loading} title="In Progress" value={summaryValue("in_progress")} tone="default" />
          <StatCard loading={summary.loading} title="Needs Improvement" value={summaryValue("needs_improvement")} tone="warning" />
          <StatCard loading={summary.loading} title="Competent" value={summaryValue("competent")} tone="default" />
          <StatCard loading={summary.loading} title="Validated" value={summaryValue("validated")} tone="accent" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search trainee..." />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48">
              <option value="">All statuses</option>
              {["not_started", "in_progress", "needs_improvement", "competent", "validated"].map((value) => (
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
              { key: "trainee", label: "Trainee", render: (row) => <div><p className="font-medium">{row.trainee ?? "—"}</p><p className="text-xs text-slate-400">{row.enrollment?.trainee?.trainee_number}</p></div> },
              { key: "competency", label: "Competency", render: (row) => row.competency_name ?? "—" },
              { key: "category", label: "Category", render: (row) => row.competency?.category ?? "—" },
              { key: "evaluator", label: "Evaluator", render: (row) => row.evaluator?.name ?? "—" },
              { key: "rating", label: "Rating", render: (row) => row.rating ?? "—" },
              { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
              { key: "evaluated", label: "Last Evaluated", render: (row) => formatDate(row.evaluated_at) },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex gap-1">
                    {canValidate && row.status === "competent" && <Button size="sm" onClick={() => validate(row)}>Validate</Button>}
                    {row.status === "validated" && <span className="text-xs text-brand-dark">Validated {row.validator?.name ? `by ${row.validator.name}` : ""}</span>}
                  </div>
                ),
              },
            ]}
            emptyTitle="No competency evaluations"
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title="Record Competency Evaluation" onClose={() => setOpen(false)} wide
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="evaluation-form" loading={saving}>{saving ? "Saving evaluation" : "Save evaluation"}</Button></>}
      >
        <form id="evaluation-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{error}</p>}
          <Field label="Trainee" required>
            <Select required value={form.enrollment_id} onChange={(e) => setForm({ ...form, enrollment_id: e.target.value })}>
              <option value="">Select trainee...</option>
              {trainees.data?.data.filter((trainee) => trainee.enrollment_id).map((trainee) => (
                <option key={trainee.enrollment_id} value={trainee.enrollment_id}>{trainee.name} ({trainee.trainee_number})</option>
              ))}
            </Select>
          </Field>
          <Field label="Competency" required>
            <Select required value={form.module_competency_id} onChange={(e) => setForm({ ...form, module_competency_id: e.target.value })}>
              <option value="">Select competency...</option>
              {competencies.data?.map((competency) => <option key={competency.id} value={competency.id}>{competency.code} — {competency.name}</option>)}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["not_started", "in_progress", "needs_improvement", "competent"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Performance Rating (1-5)"><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></Field>
          <Field label="Observations / Feedback" className="sm:col-span-2"><Textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></Field>
          <Field label="Strengths"><Textarea rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></Field>
          <Field label="Areas for Improvement / Plan"><Textarea rows={2} value={form.improvement_plan} onChange={(e) => setForm({ ...form, improvement_plan: e.target.value })} /></Field>
          <Field label="Supporting Evidence" className="sm:col-span-2"><Textarea rows={2} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} /></Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
