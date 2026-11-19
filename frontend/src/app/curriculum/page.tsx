"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui/Primitives";

interface Competency {
  id: number;
  code: string;
  name: string;
  category?: string;
  is_required: boolean;
}

interface Module {
  id: number;
  code: string;
  title: string;
  description?: string;
  estimated_minutes?: number;
  is_required: boolean;
  competencies: Competency[];
}

interface Phase {
  id: number;
  phase_number: number;
  name: string;
  description?: string;
  duration_days?: number;
  sort_order: number;
  modules: Module[];
}

interface Version {
  id: number;
  version_number: string;
  title: string;
  status: string;
  phases: Phase[];
}

interface CurriculumResponse {
  program: {
    id: number;
    name: string;
    code: string;
    curriculumVersions: Version[];
  };
}

export default function CurriculumPage() {
  const { can } = useAuth();
  const toast = useToast();
  const manage = can("curriculum.manage");
  const [programId, setProgramId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [modal, setModal] = useState<{ type: "phase" | "module" | "competency"; phaseId?: number; moduleId?: number; id?: number } | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const programs = useApi<Paginated<{ id: number; name: string; code: string }>>("/api/v1/programs");
  const curriculum = useApi<CurriculumResponse>(programId ? `/api/v1/programs/${programId}/curriculum` : null);

  useEffect(() => {
    if (programId || !programs.data?.data.length) return;
    const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("program") : null;
    setProgramId(requested ?? String(programs.data.data[0].id));
  }, [programs.data, programId]);

  const version = curriculum.data?.program.curriculumVersions?.find((item) => String(item.id) === versionId)
    ?? curriculum.data?.program.curriculumVersions?.[0];

  useEffect(() => {
    if (version && String(version.id) !== versionId) setVersionId(String(version.id));
  }, [version, versionId]);

  const reload = useCallback(async () => {
    await curriculum.refetch();
    await programs.refetch();
  }, [curriculum, programs]);

  function openPhase(phase?: Phase) {
    setError("");
    setForm({ name: phase?.name ?? "", description: phase?.description ?? "", duration_days: String(phase?.duration_days ?? ""), phase_number: String(phase?.phase_number ?? (version?.phases.length ?? 0) + 1) });
    setModal({ type: "phase", id: phase?.id });
  }

  function openModule(phaseId: number, module?: Module) {
    setError("");
    setForm({ phase_id: String(phaseId), code: module?.code ?? "", title: module?.title ?? "", description: module?.description ?? "", estimated_minutes: String(module?.estimated_minutes ?? ""), is_required: module?.is_required ?? true });
    setModal({ type: "module", phaseId, id: module?.id });
  }

  function openCompetency(moduleId: number, competency?: Competency) {
    setError("");
    setForm({ module_id: String(moduleId), code: competency?.code ?? "", name: competency?.name ?? "", category: competency?.category ?? "", is_required: competency?.is_required ?? true });
    setModal({ type: "competency", moduleId, id: competency?.id });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError("");

    try {
      if (modal.type === "phase") {
        const payload = {
          phase_number: Number(form.phase_number),
          name: form.name,
          description: form.description,
          duration_days: form.duration_days ? Number(form.duration_days) : null,
        };
        if (modal.id) await api.put(`/api/v1/curriculum-phases/${modal.id}`, payload);
        else await api.post(`/api/v1/curriculum-versions/${version?.id}/phases`, payload);
      }

      if (modal.type === "module") {
        const payload = {
          code: form.code,
          title: form.title,
          description: form.description,
          estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
          is_required: Boolean(form.is_required),
        };
        if (modal.id) await api.put(`/api/v1/training-modules/${modal.id}`, payload);
        else await api.post(`/api/v1/curriculum-phases/${modal.phaseId}/modules`, payload);
      }

      if (modal.type === "competency") {
        const payload = {
          code: form.code,
          name: form.name,
          category: form.category,
          is_required: Boolean(form.is_required),
        };
        if (modal.id) await api.put(`/api/v1/module-competencies/${modal.id}`, payload);
        else await api.post(`/api/v1/training-modules/${modal.moduleId}/competencies`, payload);
      }

      toast.notify("Curriculum saved.");
      setModal(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save curriculum change.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(type: string, id: number) {
    if (!window.confirm("Archive or delete this curriculum item?")) return;

    try {
      const endpoint = type === "phase" ? "curriculum-phases" : type === "module" ? "training-modules" : "module-competencies";
      await api.delete(`/api/v1/${endpoint}/${id}`);
      toast.notify("Curriculum item archived.");
      await reload();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to delete item.", "error");
    }
  }

  async function movePhase(phaseId: number, direction: -1 | 1) {
    if (!version) return;
    const order = version.phases.map((phase) => phase.id);
    const index = order.indexOf(phaseId);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];

    await api.post(`/api/v1/curriculum-versions/${version.id}/phases/reorder`, { order });
    await reload();
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Training Curriculum"
          description="Configure phases, modules, learning objectives and competencies."
          breadcrumb="Training Management"
          actions={manage && version ? <Button onClick={() => openPhase()}>Add Phase</Button> : undefined}
        />

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Onboarding Program" className="min-w-64">
              <Select value={programId} onChange={(event) => { setProgramId(event.target.value); setVersionId(""); }}>
                {programs.data?.data.map((program) => <option key={program.id} value={program.id}>{program.code} — {program.name}</option>)}
              </Select>
            </Field>
            <Field label="Curriculum Version" className="min-w-56">
              <Select value={version ? String(version.id) : ""} onChange={(event) => setVersionId(event.target.value)}>
                {curriculum.data?.program.curriculumVersions?.map((item) => <option key={item.id} value={item.id}>v{item.version_number} — {titleCase(item.status)}</option>)}
              </Select>
            </Field>
            {version && <Badge status={version.status}>{titleCase(version.status)}</Badge>}
            {programId && <Link href={`/programs/${programId}`}><Button variant="secondary" size="sm">Program details</Button></Link>}
          </div>
        </Card>

        {curriculum.loading && <p className="text-sm text-slate-500">Loading curriculum...</p>}
        {curriculum.error && <p className="text-sm text-red-600">{curriculum.error}</p>}

        {version && version.phases.length === 0 && (
          <Card><p className="text-sm text-slate-500">No phases configured. Add the first training phase to begin.</p></Card>
        )}

        <div className="space-y-4">
          {version?.phases.map((phase, index) => (
            <Card
              key={phase.id}
              title={`Phase ${phase.phase_number}: ${phase.name}`}
              description={phase.description ?? undefined}
              actions={
                <div className="flex gap-1">
                  <Badge status="pending">{phase.modules.length} modules</Badge>
                  {manage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => movePhase(phase.id, -1)} disabled={index === 0}>↑</Button>
                      <Button size="sm" variant="ghost" onClick={() => movePhase(phase.id, 1)} disabled={index === version.phases.length - 1}>↓</Button>
                      <Button size="sm" variant="secondary" onClick={() => openModule(phase.id)}>Add module</Button>
                      <Button size="sm" variant="ghost" onClick={() => openPhase(phase)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove("phase", phase.id)}>Delete</Button>
                    </>
                  )}
                </div>
              }
            >
              <div className="space-y-2">
                {phase.modules.length === 0 && <p className="text-sm text-slate-500">No modules yet.</p>}
                {phase.modules.map((module) => (
                  <div key={module.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{module.title}</p>
                        <p className="text-xs text-slate-400">{module.code} · {module.estimated_minutes ?? "—"} min · {module.is_required ? "Mandatory" : "Optional"}</p>
                      </div>
                      {manage && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => openCompetency(module.id)}>Add competency</Button>
                          <Button size="sm" variant="ghost" onClick={() => openModule(phase.id, module)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove("module", module.id)}>Delete</Button>
                        </div>
                      )}
                    </div>
                    {module.competencies?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {module.competencies.map((competency) => (
                          <span key={competency.id} className="inline-flex items-center gap-1 rounded-full border bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            {competency.name}
                            {manage && (
                              <>
                                <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => openCompetency(module.id, competency)}>edit</button>
                                <button type="button" className="text-red-400 hover:text-red-600" onClick={() => remove("competency", competency.id)}>×</button>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={Boolean(modal)} title={modal?.id ? "Edit curriculum item" : `Add ${modal?.type ?? ""}`} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button type="submit" form="curriculum-form" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
      >
        <form id="curriculum-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {modal?.type === "phase" && (
            <>
              <Field label="Phase Number" required><Input type="number" min={1} required value={String(form.phase_number ?? "")} onChange={(e) => setForm({ ...form, phase_number: e.target.value })} /></Field>
              <Field label="Phase Name" required><Input required value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Expected Duration (days)"><Input type="number" min={1} value={String(form.duration_days ?? "")} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></Field>
            </>
          )}

          {modal?.type === "module" && (
            <>
              <Field label="Module Code" required><Input required value={String(form.code ?? "")} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
              <Field label="Module Title" required><Input required value={String(form.title ?? "")} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Estimated Minutes"><Input type="number" min={1} value={String(form.estimated_minutes ?? "")} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} /></Field>
              <Field label="Mandatory module">
                <Select value={form.is_required ? "1" : "0"} onChange={(e) => setForm({ ...form, is_required: e.target.value === "1" })}>
                  <option value="1">Required</option>
                  <option value="0">Optional</option>
                </Select>
              </Field>
            </>
          )}

          {modal?.type === "competency" && (
            <>
              <Field label="Competency Code" required><Input required value={String(form.code ?? "")} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
              <Field label="Competency Name" required><Input required value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Category"><Input value={String(form.category ?? "")} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
              <Field label="Mandatory">
                <Select value={form.is_required ? "1" : "0"} onChange={(e) => setForm({ ...form, is_required: e.target.value === "1" })}>
                  <option value="1">Required</option>
                  <option value="0">Optional</option>
                </Select>
              </Field>
            </>
          )}
        </form>
      </Modal>
    </DashboardLayout>
  );
}
