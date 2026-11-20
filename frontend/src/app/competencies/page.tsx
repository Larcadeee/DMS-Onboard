"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, StatCard, Textarea } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface CompetencyRow {
  id: number;
  code: string;
  name: string;
  category?: string;
  description?: string;
  expected_performance?: string;
  evaluation_criteria?: string;
  is_required: boolean;
  evaluations_count?: number;
  training_module_id: number;
  training_module?: { title: string; curriculum_phase?: { curriculum_version?: { program?: { name: string } } } };
}

export default function CompetenciesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const manage = can("competencies.create") || can("competencies.update") || can("competencies.validate");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompetencyRow | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const debounced = useDebounced(search);
  const list = useApi<Paginated<CompetencyRow>>(`/api/v1/competencies${query({ search: debounced, category, page })}`);
  const summary = useApi<Record<string, number>>("/api/v1/competencies/summary");
  const categories = useApi<string[]>("/api/v1/competencies/categories");
  const modules = useApi<Array<{ id: number; code: string; title: string }>>("/api/v1/lookups/modules");

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", category: "", description: "", expected_performance: "", evaluation_criteria: "", is_required: true, training_module_id: "" });
    setError("");
    setOpen(true);
  }

  function openEdit(row: CompetencyRow) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      category: row.category ?? "",
      description: row.description ?? "",
      expected_performance: row.expected_performance ?? "",
      evaluation_criteria: row.evaluation_criteria ?? "",
      is_required: row.is_required,
      training_module_id: String(row.training_module_id),
    });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      code: form.code,
      name: form.name,
      category: form.category,
      description: form.description,
      expected_performance: form.expected_performance,
      evaluation_criteria: form.evaluation_criteria,
      is_required: Boolean(form.is_required),
    };

    try {
      if (editing) await api.put(`/api/v1/module-competencies/${editing.id}`, payload);
      else await api.post(`/api/v1/training-modules/${form.training_module_id}/competencies`, payload);
      toast.notify("Competency saved.");
      setOpen(false);
      await list.refetch();
      await summary.refetch();
      await categories.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save competency.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(row: CompetencyRow) {
    if (!window.confirm("Archive this competency? Existing evaluations are retained.")) return;

    try {
      await api.delete(`/api/v1/module-competencies/${row.id}`);
      toast.notify("Competency archived.");
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to archive competency.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Competency Framework"
          description="Define the competencies required for Emergency Telecommunicators and map them to training modules."
          breadcrumb="Evaluation and Monitoring"
          actions={manage ? <Button onClick={openCreate}>Add Competency</Button> : undefined}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard loading={summary.loading} title="Total Competencies" value={summary.data?.total ?? "—"} />
          <StatCard loading={summary.loading} title="Categories" value={summary.data?.categories ?? "—"} tone="default" />
          <StatCard loading={summary.loading} title="Archived" value={summary.data?.archived ?? "—"} tone="warning" />
          <StatCard loading={summary.loading} title="Validated Evaluations" value={summary.data?.validated ?? "—"} tone="accent" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search competency code or name..." />
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-52">
              <option value="">All categories</option>
              {categories.data?.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "code", label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
              { key: "name", label: "Competency" },
              { key: "category", label: "Category", render: (row) => row.category ?? "—" },
              { key: "module", label: "Module", render: (row) => row.training_module?.title ?? "—" },
              { key: "evaluations", label: "Evaluations", render: (row) => String(row.evaluations_count ?? 0) },
              { key: "required", label: "Requirement", render: (row) => <Badge status={row.is_required ? "active" : "draft"}>{row.is_required ? "Mandatory" : "Optional"}</Badge> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex gap-1">
                    {manage && <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>}
                    {manage && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => archive(row)}>Archive</Button>}
                  </div>
                ),
              },
            ]}
            emptyTitle="No competencies defined"
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title={editing ? "Edit Competency" : "Add Competency"} onClose={() => setOpen(false)} wide
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="competency-form" loading={saving}>{saving ? "Saving changes" : "Save changes"}</Button></>}
      >
        <form id="competency-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{error}</p>}
          <Field label="Competency Code" required><Input required value={String(form.code ?? "")} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Competency Name" required><Input required value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category"><Input value={String(form.category ?? "")} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Related Training Module" required={!editing}>
            <Select required={!editing} value={String(form.training_module_id ?? "")} onChange={(e) => setForm({ ...form, training_module_id: e.target.value })} disabled={Boolean(editing)}>
              <option value="">Select module...</option>
              {modules.data?.map((module) => <option key={module.id} value={module.id}>{module.code} — {module.title}</option>)}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Expected Performance" className="sm:col-span-2"><Textarea rows={2} value={String(form.expected_performance ?? "")} onChange={(e) => setForm({ ...form, expected_performance: e.target.value })} /></Field>
          <Field label="Evaluation Criteria" className="sm:col-span-2"><Textarea rows={2} value={String(form.evaluation_criteria ?? "")} onChange={(e) => setForm({ ...form, evaluation_criteria: e.target.value })} /></Field>
          <Field label="Mandatory competency">
            <Select value={form.is_required ? "1" : "0"} onChange={(e) => setForm({ ...form, is_required: e.target.value === "1" })}>
              <option value="1">Mandatory</option>
              <option value="0">Optional</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
