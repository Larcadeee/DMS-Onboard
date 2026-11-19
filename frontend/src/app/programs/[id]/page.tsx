"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/hooks";
import { type Paginated } from "@/lib/api/client";
import { Badge, Button, Card, DetailRow, ErrorState, LoadingSkeleton, PageHeader, Tabs } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate, titleCase } from "@/lib/format";

interface Module {
  id: number;
  code: string;
  title: string;
  estimated_minutes?: number;
  competencies?: Array<{ id: number; code: string; name: string }>;
}

interface Phase {
  id: number;
  phase_number: number;
  name: string;
  description?: string;
  duration_days?: number;
  modules: Module[];
}

interface Version {
  id: number;
  version_number: string;
  title: string;
  status: string;
  phases: Phase[];
}

interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
  objectives?: string;
  target_participants?: string;
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  curriculumVersions: Version[];
}

interface TraineeRow {
  id: number;
  name: string;
  trainee_number: string;
  status: string;
  progress: number;
  current_phase?: string;
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState("overview");
  const program = useApi<{ program: Program; trainees_count: number }>(`/api/v1/programs/${params.id}`);
  const trainees = useApi<Paginated<TraineeRow>>(`/api/v1/trainees?program_id=${params.id}`);

  const version = program.data?.program.curriculumVersions?.[0];
  const phases = version?.phases ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title={program.data?.program.name ?? "Program"}
          description={program.data?.program.description}
          breadcrumb={`Programs / ${program.data?.program.code ?? ""}`}
          actions={
            <>
              <Link href="/programs"><Button variant="secondary">Back to programs</Button></Link>
              <Link href={`/curriculum?program=${params.id}`}><Button>Manage curriculum</Button></Link>
            </>
          }
        />

        {program.loading && <LoadingSkeleton rows={6} />}
        {program.error && <ErrorState message={program.error} onRetry={program.refetch} />}

        {program.data && (
          <>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "curriculum", label: "Curriculum", count: phases.length },
                { value: "trainees", label: "Trainees", count: program.data.trainees_count },
              ]}
            />

            {tab === "overview" && (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Program Information" className="lg:col-span-2">
                  <dl className="divide-y">
                    <DetailRow label="Program code" value={<span className="font-mono text-xs">{program.data.program.code}</span>} />
                    <DetailRow label="Status" value={<Badge status={program.data.program.status}>{titleCase(program.data.program.status)}</Badge>} />
                    <DetailRow label="Duration" value={program.data.program.duration_days ? `${program.data.program.duration_days} days` : "—"} />
                    <DetailRow label="Start date" value={formatDate(program.data.program.start_date)} />
                    <DetailRow label="End date" value={formatDate(program.data.program.end_date)} />
                    <DetailRow label="Target participants" value={program.data.program.target_participants ?? "—"} />
                    <DetailRow label="Objectives" value={program.data.program.objectives ?? "—"} />
                  </dl>
                </Card>

                <Card title="Program Snapshot">
                  <dl className="divide-y">
                    <DetailRow label="Curriculum versions" value={program.data.program.curriculumVersions.length} />
                    <DetailRow label="Active version" value={version ? `v${version.version_number} (${version.status})` : "—"} />
                    <DetailRow label="Training phases" value={phases.length} />
                    <DetailRow label="Assigned trainees" value={program.data.trainees_count} />
                  </dl>
                </Card>
              </div>
            )}

            {tab === "curriculum" && (
              <div className="space-y-4">
                {phases.length === 0 && <Card><p className="text-sm text-slate-500">No curriculum phases configured yet.</p></Card>}
                {phases.map((phase) => (
                  <Card
                    key={phase.id}
                    title={`Phase ${phase.phase_number}: ${phase.name}`}
                    description={phase.description ?? undefined}
                    actions={<Badge status="active">{phase.modules.length} modules</Badge>}
                  >
                    <div className="space-y-2">
                      {phase.modules.length === 0 && <p className="text-sm text-slate-500">No modules in this phase.</p>}
                      {phase.modules.map((module) => (
                        <div key={module.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{module.title}</p>
                            <p className="text-xs text-slate-400">{module.code} · {module.estimated_minutes ? `${module.estimated_minutes} minutes` : "Duration TBA"}</p>
                          </div>
                          <span className="text-xs text-slate-500">{module.competencies?.length ?? 0} competencies</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {tab === "trainees" && (
              <Card title="Assigned Trainees" description="Trainees enrolled under this program">
                <DataTable
                  rows={trainees.data?.data ?? []}
                  loading={trainees.loading}
                  error={trainees.error}
                  onRetry={trainees.refetch}
                  columns={[
                    { key: "trainee_number", label: "Employee No." },
                    { key: "name", label: "Trainee", render: (row) => <Link href={`/trainees/${row.id}`} className="font-medium hover:underline">{row.name}</Link> },
                    { key: "current_phase", label: "Current Phase", render: (row) => row.current_phase ?? "—" },
                    { key: "progress", label: "Progress", render: (row) => `${Math.round(Number(row.progress ?? 0))}%` },
                    { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                  ]}
                  emptyTitle="No trainees assigned"
                />
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
