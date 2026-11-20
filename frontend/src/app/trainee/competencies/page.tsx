"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoading, StatCard } from "@/components/ui/Primitives";

interface Evaluation {
  id: number;
  status: string;
  rating?: number;
  feedback?: string;
  strengths?: string;
  improvement_plan?: string;
  evaluated_at?: string;
  validated_at?: string;
  competency?: {
    code: string;
    name: string;
    category?: string;
    expected_performance?: string;
    evaluation_criteria?: string;
  };
  evaluator?: { name: string };
  validator?: { name: string };
}

export default function TraineeCompetenciesPage() {
  const { data, loading, error, refetch } = useApi<{ evaluations: Evaluation[] }>("/api/v1/my/competencies");
  const evaluations = data?.evaluations ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Competency Evaluation"
          description="Competency observations and validated feedback recorded by your evaluators."
          breadcrumb="My Onboarding"
        />

        {loading && <PageLoading label="Loading competency evaluations" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Evaluations" value={evaluations.length} />
              <StatCard title="Competent" value={evaluations.filter((evaluation) => ["competent", "validated"].includes(evaluation.status)).length} tone="accent" />
              <StatCard title="Validated" value={evaluations.filter((evaluation) => evaluation.status === "validated").length} tone="default" />
              <StatCard title="Needs Improvement" value={evaluations.filter((evaluation) => evaluation.status === "needs_improvement").length} tone="warning" />
            </div>

            {evaluations.length === 0 && <Card><EmptyState title="No competency evaluations yet" description="Your trainer will record competency observations during practical sessions." /></Card>}

            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{evaluation.competency?.name}</p>
                        <Badge status={evaluation.status}>{titleCase(evaluation.status)}</Badge>
                        {evaluation.rating ? <span className="text-xs text-slate-500">Rating {evaluation.rating}/5</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {evaluation.competency?.code}
                        {evaluation.competency?.category ? ` · ${evaluation.competency.category}` : ""}
                        {evaluation.evaluator?.name ? ` · Evaluated by ${evaluation.evaluator.name}` : ""}
                        {evaluation.evaluated_at ? ` on ${formatDate(evaluation.evaluated_at)}` : ""}
                      </p>
                    </div>
                    {evaluation.status === "validated" && evaluation.validated_at && (
                      <p className="text-xs text-brand-dark">Validated {formatDate(evaluation.validated_at)}{evaluation.validator?.name ? ` by ${evaluation.validator.name}` : ""}</p>
                    )}
                  </div>

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    {evaluation.competency?.expected_performance && (
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Expected performance</dt><dd className="mt-0.5 text-slate-700">{evaluation.competency.expected_performance}</dd></div>
                    )}
                    {evaluation.competency?.evaluation_criteria && (
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Evaluation criteria</dt><dd className="mt-0.5 text-slate-700">{evaluation.competency.evaluation_criteria}</dd></div>
                    )}
                    {evaluation.feedback && (
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Feedback</dt><dd className="mt-0.5 text-slate-700">{evaluation.feedback}</dd></div>
                    )}
                    {evaluation.strengths && (
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Strengths</dt><dd className="mt-0.5 text-slate-700">{evaluation.strengths}</dd></div>
                    )}
                    {evaluation.improvement_plan && (
                      <div className="sm:col-span-2"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Improvement plan</dt><dd className="mt-0.5 text-slate-700">{evaluation.improvement_plan}</dd></div>
                    )}
                  </dl>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
