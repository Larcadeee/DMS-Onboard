"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { titleCase } from "@/lib/format";
import { Badge, Button, Card, DetailRow, ErrorState, Field, Input, LoadingSkeleton, Modal, PageHeader, Select, Textarea } from "@/components/ui/Primitives";

interface Question {
  id: number;
  question_type: string;
  question_text: string;
  options?: string[];
  correct_answer?: { value?: string } | string[] | string | null;
  points: string;
}

interface AssessmentDetail {
  assessment: {
    id: number;
    title: string;
    instructions?: string;
    assessment_type: string;
    total_points: string;
    passing_score: string;
    attempts_allowed: number;
    time_limit_minutes?: number;
    is_published: boolean;
    release_results: boolean;
    attempts_count?: number;
    questions: Question[];
    training_module?: { title: string; curriculum_phase?: { curriculum_version?: { program?: { name: string } } } };
    evaluator?: { name: string };
  };
}

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const toast = useToast();
  const detail = useApi<AssessmentDetail>(`/api/v1/assessments/${params.id}`);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState({ question_text: "", question_type: "multiple_choice", points: "1", options: "", correct_answer: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const assessment = detail.data?.assessment;

  function correctAnswerValue(question: Question): string {
    const answer = question.correct_answer;
    if (!answer) return "";
    if (typeof answer === "string") return answer;
    if (Array.isArray(answer)) return answer.join(",");
    return answer.value ?? "";
  }

  function openCreate() {
    setEditing(null);
    setForm({ question_text: "", question_type: "multiple_choice", points: "1", options: "", correct_answer: "" });
    setError("");
    setOpen(true);
  }

  function openEdit(question: Question) {
    setEditing(question);
    setForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: String(question.points),
      options: (question.options ?? []).join("\n"),
      correct_answer: correctAnswerValue(question),
    });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      question_text: form.question_text,
      question_type: form.question_type,
      points: Number(form.points),
      options: form.question_type === "multiple_choice" ? form.options.split("\n").map((line) => line.trim()).filter(Boolean) : null,
      correct_answer: form.correct_answer ? { value: form.correct_answer } : null,
    };

    try {
      if (editing) await api.put(`/api/v1/assessment-questions/${editing.id}`, payload);
      else await api.post(`/api/v1/assessments/${params.id}/questions`, payload);
      toast.notify("Question saved.");
      setOpen(false);
      await detail.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save question.");
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(id: number) {
    if (!window.confirm("Delete this question?")) return;

    try {
      await api.delete(`/api/v1/assessment-questions/${id}`);
      toast.notify("Question deleted.");
      await detail.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to delete question.", "error");
    }
  }

  async function togglePublish() {
    await api.post(`/api/v1/assessments/${params.id}/publish`);
    await detail.refetch();
  }

  async function releaseResults() {
    try {
      await api.post(`/api/v1/assessments/${params.id}/release`);
      toast.notify("Results released to trainees.");
      await detail.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to release results.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title={assessment?.title ?? "Assessment"}
          description={assessment ? `${titleCase(assessment.assessment_type)} assessment · ${assessment.training_module?.title ?? ""}` : undefined}
          breadcrumb="Assessments"
          actions={
            <>
              <Link href="/assessments"><Button variant="secondary">Back</Button></Link>
              {assessment && can("assessments.update") && <Button variant="secondary" onClick={togglePublish}>{assessment.is_published ? "Unpublish" : "Publish"}</Button>}
              {assessment && can("assessments.evaluate") && <Button variant="secondary" onClick={releaseResults} disabled={assessment.release_results}>{assessment.release_results ? "Results released" : "Release results"}</Button>}
              {assessment && can("assessments.update") && <Button onClick={openCreate}>Add Question</Button>}
            </>
          }
        />

        {detail.loading && <LoadingSkeleton rows={6} />}
        {detail.error && <ErrorState message={detail.error} onRetry={detail.refetch} />}

        {assessment && (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Assessment Configuration" className="lg:col-span-2">
                <dl className="divide-y">
                  <DetailRow label="Program" value={assessment.training_module?.curriculum_phase?.curriculum_version?.program?.name ?? "—"} />
                  <DetailRow label="Module" value={assessment.training_module?.title ?? "—"} />
                  <DetailRow label="Type" value={titleCase(assessment.assessment_type)} />
                  <DetailRow label="Scores" value={`Passing ${assessment.passing_score} of ${assessment.total_points}`} />
                  <DetailRow label="Attempts allowed" value={assessment.attempts_allowed} />
                  <DetailRow label="Time limit" value={assessment.time_limit_minutes ? `${assessment.time_limit_minutes} minutes` : "None"} />
                  <DetailRow label="Evaluator" value={assessment.evaluator?.name ?? "Unassigned"} />
                  <DetailRow label="Status" value={<div className="flex gap-2"><Badge status={assessment.is_published ? "published" : "draft"}>{assessment.is_published ? "Published" : "Draft"}</Badge><Badge status={assessment.release_results ? "released" : "pending"}>{assessment.release_results ? "Results released" : "Results unreleased"}</Badge></div>} />
                  <DetailRow label="Instructions" value={assessment.instructions ?? "—"} />
                </dl>
              </Card>
              <Card title="Summary">
                <dl className="divide-y">
                  <DetailRow label="Questions" value={assessment.questions.length} />
                  <DetailRow label="Recorded attempts" value={assessment.attempts_count ?? 0} />
                </dl>
                <div className="mt-4">
                  <Link href={`/assessment-results?assessment=${assessment.id}`}><Button variant="secondary" size="sm">View results</Button></Link>
                </div>
              </Card>
            </div>

            <Card title="Question Bank" description="Written examination questions and scoring">
              <div className="space-y-3">
                {assessment.questions.length === 0 && <p className="text-sm text-slate-500">No questions added yet.</p>}
                {assessment.questions.map((question, index) => (
                  <div key={question.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{index + 1}. {question.question_text}</p>
                        <p className="mt-1 text-xs text-slate-400">{titleCase(question.question_type)} · {question.points} points</p>
                      </div>
                      {can("assessments.update") && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(question)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeQuestion(question.id)}>Delete</Button>
                        </div>
                      )}
                    </div>
                    {question.options && question.options.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        {question.options.map((option) => (
                          <li key={option} className="rounded border bg-slate-50 px-2 py-1">
                            {option}
                            {correctAnswerValue(question) === option && <span className="ml-2 text-xs font-semibold text-brand-dark">correct</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>

      <Modal open={open} title={editing ? "Edit Question" : "Add Question"} onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="question-form" loading={saving}>{saving ? "Saving question" : "Save question"}</Button></>}
      >
        <form id="question-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{error}</p>}
          <Field label="Question Text" required className="sm:col-span-2"><Textarea rows={3} required value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} /></Field>
          <Field label="Question Type" required>
            <Select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })}>
              {["multiple_choice", "true_false", "short_answer", "essay"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Points" required><Input type="number" min={0} required value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></Field>
          {form.question_type === "multiple_choice" && (
            <Field label="Answer Options" hint="One option per line" className="sm:col-span-2">
              <Textarea rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
            </Field>
          )}
          <Field label="Correct Answer" hint="Used for automatic scoring of objective questions." className="sm:col-span-2">
            <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
