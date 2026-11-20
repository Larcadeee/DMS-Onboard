"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { titleCase } from "@/lib/format";
import { Badge, Card, ErrorState, PageHeader, PageLoading, ProgressBar, StatCard } from "@/components/ui/Primitives";

interface Module {
  id: number;
  code: string;
  title: string;
  description?: string;
  duration_hours?: number;
  is_completed: boolean;
  competencies?: Array<{ id: number; code: string; name: string }>;
}

interface Phase {
  id: number;
  name: string;
  description?: string;
  sort_order?: number;
  completed_modules: number;
  is_completed: boolean;
  modules: Module[];
}

interface ProgramView {
  enrollment: { enrollment_number: string; status: string; curriculum_version?: { version_number: string; program?: { name: string; description?: string } }; trainer?: { name: string } };
  phases: Phase[];
  progress: { progress: number; current_phase?: string; modules_completed: number; modules_total: number };
}

export default function TraineeProgramPage() {
  const { data, loading, error, refetch } = useApi<ProgramView>("/api/v1/my/program");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Onboarding Program"
          description={data?.enrollment.curriculum_version?.program?.name ?? "Your training curriculum and module completion."}
          breadcrumb="My Onboarding"
          actions={data ? <Badge status={data.enrollment.status}>{titleCase(data.enrollment.status)}</Badge> : undefined}
        />

        {loading && <PageLoading label="Loading your onboarding program" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Overall Progress" value={`${Math.round(data.progress.progress)}%`} />
              <StatCard title="Modules Completed" value={`${data.progress.modules_completed}/${data.progress.modules_total}`} tone="default" />
              <StatCard title="Current Phase" value={data.progress.current_phase ?? "—"} tone="accent" />
            </div>

            <Card
              title="Program Details"
              description={data.enrollment.curriculum_version?.program?.description ?? undefined}
            >
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-slate-500">Enrollment:</span> {data.enrollment.enrollment_number}</p>
                <p><span className="text-slate-500">Curriculum version:</span> {data.enrollment.curriculum_version?.version_number}</p>
                <p><span className="text-slate-500">Trainer:</span> {data.enrollment.trainer?.name ?? "Unassigned"}</p>
              </div>
              <div className="mt-4"><ProgressBar value={data.progress.progress} /></div>
            </Card>

            <div className="space-y-3">
              {data.phases.map((phase) => (
                <details key={phase.id} open={!phase.is_completed} className="rounded-lg border bg-white">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{phase.name}</p>
                      <p className="text-xs text-slate-500">{phase.completed_modules}/{phase.modules.length} modules completed</p>
                    </div>
                    <Badge status={phase.is_completed ? "completed" : "ongoing"}>{phase.is_completed ? "Completed" : "In progress"}</Badge>
                  </summary>
                  <div className="border-t px-4 py-3">
                    {phase.description && <p className="mb-3 text-sm text-slate-600">{phase.description}</p>}
                    <ul className="divide-y">
                      {phase.modules.map((module) => (
                        <li key={module.id} className="py-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-800">{module.code} — {module.title}</p>
                              {module.description && <p className="mt-0.5 text-sm text-slate-500">{module.description}</p>}
                              {module.duration_hours ? <p className="mt-0.5 text-xs text-slate-400">{module.duration_hours} hours</p> : null}
                            </div>
                            <Badge status={module.is_completed ? "completed" : "scheduled"}>{module.is_completed ? "Completed" : "Pending"}</Badge>
                          </div>
                          {module.competencies && module.competencies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {module.competencies.map((competency) => (
                                <span key={competency.id} className="rounded-full border bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{competency.code} · {competency.name}</span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
