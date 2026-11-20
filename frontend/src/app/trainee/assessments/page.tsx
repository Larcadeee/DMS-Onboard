"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, titleCase } from "@/lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, PageLoading, StatCard, Textarea } from "@/components/ui/Primitives";

interface Attempt {
  id: number;
  attempt_number: number;
  status: string;
  score?: number | null;
  feedback?: string | null;
  submitted_at?: string;
  started_at?: string;
}

interface Assessment {
  id: number;
  title: string;
  instructions?: string;
  assessment_type: string;
  total_points: number;
  passing_score: number;
  time_limit_minutes?: number;
  attempts_allowed: number;
  attempts_used: number;
  can_start: boolean;
  release_results: boolean;
  training_module?: { title: string };
  attempts: Attempt[];
}

interface Question {
  id: number;
  question_type: string;
  question_text: string;
  options?: string[];
  points: number;
}

export default function TraineeAssessmentsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<{ assessments: Assessment[] }>("/api/v1/my/assessments");
  const [active, setActive] = useState<{ assessment: Assessment; attemptId: number; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [starting, setStarting] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function start(assessment: Assessment) {
    if (!window.confirm(`Start "${assessment.title}"? The attempt timer begins immediately.`)) return;
    setStarting(assessment.id);

    try {
      const response = await api.post<{ attempt: { id: number }; questions: Question[] }>(`/api/v1/my/assessments/${assessment.id}/attempts`);
      setAnswers({});
      setActive({ assessment, attemptId: response.attempt.id, questions: response.questions });
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to start assessment.", "error");
    } finally {
      setStarting(null);
    }
  }

  async function submit() {
    if (!active) return;

    const unanswered = active.questions.filter((question) => !answers[question.id]?.trim()).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question(s) are unanswered. Submit anyway?`)) return;

    setSubmitting(true);

    try {
      await api.post(`/api/v1/my/assessment-attempts/${active.attemptId}/submit`, {
        answers: active.questions.map((question) => ({
          question_id: question.id,
          answer: answers[question.id] ?? null,
        })),
      });
      toast.notify("Assessment submitted.");
      setActive(null);
      await refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to submit assessment.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const assessments = data?.assessments ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Assessments"
          description="Written examinations and practical evaluations assigned to your program."
          breadcrumb="My Onboarding"
        />

        {loading && <PageLoading label="Loading your assessments" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Assigned Assessments" value={assessments.length} />
              <StatCard title="Available to Take" value={assessments.filter((assessment) => assessment.can_start).length} tone="accent" />
              <StatCard title="Attempts Used" value={assessments.reduce((total, assessment) => total + assessment.attempts_used, 0)} tone="default" />
            </div>

            {assessments.length === 0 && <Card><EmptyState title="No assessments assigned" description="Assessments will appear once your trainer publishes them." /></Card>}

            <div className="space-y-4">
              {assessments.map((assessment) => (
                <Card key={assessment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{assessment.title}</p>
                        <Badge status={assessment.assessment_type === "practical" ? "pending" : "scheduled"}>{titleCase(assessment.assessment_type)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{assessment.instructions}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {assessment.training_module?.title} · {assessment.total_points} points · Passing {assessment.passing_score}
                        {assessment.time_limit_minutes ? ` · ${assessment.time_limit_minutes} min` : ""} · Attempts {assessment.attempts_used}/{assessment.attempts_allowed}
                      </p>
                    </div>
                    {assessment.can_start ? (
                      <Button onClick={() => start(assessment)} loading={starting === assessment.id}>{starting === assessment.id ? "Starting attempt" : "Start attempt"}</Button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {assessment.assessment_type === "practical" ? "Conducted by your evaluator" : "No remaining attempts"}
                      </span>
                    )}
                  </div>

                  {assessment.attempts.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Attempt history</p>
                      <ul className="divide-y text-sm">
                        {assessment.attempts.map((attempt) => (
                          <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span>Attempt {attempt.attempt_number} <span className="text-xs text-slate-400">· {formatDateTime(attempt.submitted_at ?? attempt.started_at)}</span></span>
                            <span className="flex items-center gap-2">
                              <Badge status={attempt.status}>{titleCase(attempt.status)}</Badge>
                              <span className="text-xs text-slate-500">{attempt.score !== null && attempt.score !== undefined ? `${attempt.score} pts` : assessment.release_results ? "Pending" : "Withheld"}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={Boolean(active)} title={active?.assessment.title ?? "Assessment"} description={active?.assessment.instructions} onClose={() => setActive(null)} wide
        footer={<><Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button><Button onClick={submit} loading={submitting}>{submitting ? "Submitting assessment" : "Submit assessment"}</Button></>}
      >
        {active && (
          <div className="space-y-5">
            <p className="rounded-md border border-line bg-canvas px-3.5 py-2.5 text-xs leading-5 text-ink-soft">
              {active.questions.length} questions · {active.assessment.total_points} total points · Passing score {active.assessment.passing_score}
            </p>

            {active.questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border p-4">
                <p className="text-sm font-medium text-slate-900">{index + 1}. {question.question_text} <span className="text-xs text-slate-400">({question.points} pts)</span></p>
                {["multiple_choice", "true_false"].includes(question.question_type) && question.options ? (
                  <div className="mt-2 space-y-1.5">
                    {question.options.map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50">
                        <input type="radio" name={`question-${question.id}`} checked={answers[question.id] === option} onChange={() => setAnswers({ ...answers, [question.id]: option })} />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Textarea rows={3} className="mt-2" value={answers[question.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} placeholder="Type your answer..." />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
