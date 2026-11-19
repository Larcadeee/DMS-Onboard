"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ResourcePage } from "@/components/ui/ResourcePage";
import { Badge, Button } from "@/components/ui/Primitives";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { formatDate, titleCase } from "@/lib/format";

export default function AssessmentsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const modules = useApi<Array<{ id: number; code: string; title: string }>>("/api/v1/lookups/modules");
  const staff = useApi<Array<{ id: number; name: string }>>("/api/v1/lookups/users");

  return (
    <DashboardLayout>
      <ResourcePage
        title="Assessment Management"
        description="Manage written examinations, practical assessments and scenario-based evaluations."
        breadcrumb="Evaluation and Monitoring"
        endpoint="/api/v1/assessments"
        summaryEndpoint="/api/v1/assessments/summary"
        summaryCards={[
          { key: "total", title: "Total Assessments" },
          { key: "draft", title: "Draft" },
          { key: "published", title: "Published" },
          { key: "pending_evaluations", title: "Pending Evaluations" },
        ]}
        canManage={can("assessments.create")}
        createLabel="Create Assessment"
        searchPlaceholder="Search assessment title..."
        filters={[
          { key: "status", label: "Status", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
          { key: "type", label: "Type", options: [{ value: "written", label: "Written" }, { value: "practical", label: "Practical" }, { value: "scenario", label: "Scenario" }] },
        ]}
        defaults={{ assessment_type: "written", total_points: 100, passing_score: 75, attempts_allowed: 1, is_published: false, release_results: false }}
        transformForm={(values) => {
          const payload: Record<string, unknown> = { ...values };
          delete payload.id;
          return payload;
        }}
        formTitle={{ create: "Create Assessment", edit: "Edit Assessment" }}
        columns={[
          {
            key: "title",
            label: "Assessment",
            render: (row) => (
              <Link href={`/assessments/${row.id}`} className="font-medium text-slate-900 hover:underline">{String(row.title)}</Link>
            ),
          },
          { key: "assessment_type", label: "Type", render: (row) => titleCase(String(row.assessment_type)) },
          {
            key: "program",
            label: "Program",
            render: (row) => {
              const trainingModule = row.training_module as { curriculum_phase?: { curriculum_version?: { program?: { name?: string } } } } | null;
              return trainingModule?.curriculum_phase?.curriculum_version?.program?.name ?? "—";
            },
          },
          { key: "training_module", label: "Module", render: (row) => (row.training_module as { title?: string } | null)?.title ?? "—" },
          { key: "passing_score", label: "Passing", render: (row) => `${String(row.passing_score ?? "—")} / ${String(row.total_points ?? "—")}` },
          { key: "attempts_allowed", label: "Attempts", render: (row) => String(row.attempts_allowed ?? 1) },
          { key: "questions_count", label: "Questions", render: (row) => String(row.questions_count ?? 0) },
          { key: "is_published", label: "Status", render: (row) => <Badge status={row.is_published ? "published" : "draft"}>{row.is_published ? "Published" : "Draft"}</Badge> },
          { key: "created_at", label: "Created", render: (row) => formatDate(String(row.created_at)) },
        ]}
        fields={[
          { name: "title", label: "Assessment Title", required: true, colSpan: 2 },
          { name: "instructions", label: "Instructions", type: "textarea", colSpan: 2 },
          {
            name: "training_module_id",
            label: "Training Module",
            type: "select",
            required: true,
            options: modules.data?.map((module) => ({ value: module.id, label: `${module.code} — ${module.title}` })) ?? [],
          },
          {
            name: "assessment_type",
            label: "Assessment Type",
            type: "select",
            options: ["written", "practical", "scenario"].map((value) => ({ value, label: titleCase(value) })),
          },
          { name: "total_points", label: "Maximum Score", type: "number", required: true },
          { name: "passing_score", label: "Passing Score", type: "number", required: true },
          { name: "time_limit_minutes", label: "Time Limit (minutes)", type: "number" },
          { name: "attempts_allowed", label: "Allowed Attempts", type: "number" },
          {
            name: "evaluator_id",
            label: "Assigned Evaluator",
            type: "select",
            options: staff.data?.map((user) => ({ value: user.id, label: user.name })) ?? [],
          },
          { name: "available_from", label: "Available From", type: "datetime-local" },
          { name: "available_to", label: "Available Until", type: "datetime-local" },
          { name: "is_published", label: "Publish assessment", type: "checkbox" },
          { name: "release_results", label: "Release results to trainees", type: "checkbox" },
        ]}
        rowActions={(row, { edit, remove }) => {
          async function togglePublish() {
            try {
              await api.post(`/api/v1/assessments/${row.id}/publish`);
              toast.notify("Assessment publication updated.");
            } catch (err) {
              toast.notify(err instanceof Error ? err.message : "Unable to publish assessment.", "error");
            }
          }

          return (
            <>
              <Link href={`/assessments/${row.id}`}><Button size="sm" variant="secondary">Open</Button></Link>
              {can("assessments.update") && <Button size="sm" variant="ghost" onClick={() => edit(row)}>Edit</Button>}
              {can("assessments.update") && <Button size="sm" variant="ghost" onClick={togglePublish}>{row.is_published ? "Unpublish" : "Publish"}</Button>}
              {can("assessments.manage") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row)}>Delete</Button>}
            </>
          );
        }}
      />
    </DashboardLayout>
  );
}
