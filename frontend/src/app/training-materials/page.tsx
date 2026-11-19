"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { ResourcePage } from "@/components/ui/ResourcePage";
import { Button, Badge } from "@/components/ui/Primitives";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { downloadFile } from "@/lib/api/client";
import { formatDate, titleCase } from "@/lib/format";

export default function MaterialsPage() {
  const { can } = useAuth();
  const programs = useApi<Array<{ id: number; name: string; code: string }>>("/api/v1/lookups/programs");
  const modules = useApi<Array<{ id: number; code: string; title: string }>>("/api/v1/lookups/modules");

  return (
    <DashboardLayout>
      <ResourcePage
        title="Training Materials"
        description="Central repository of learning guides, references and training documents."
        breadcrumb="Training Management"
        endpoint="/api/v1/materials"
        summaryEndpoint="/api/v1/materials/summary"
        summaryCards={[
          { key: "total", title: "Total Materials" },
          { key: "published", title: "Published" },
          { key: "draft", title: "Draft" },
          { key: "archived", title: "Archived" },
        ]}
        canManage={can("materials.manage")}
        createLabel="Upload Material"
        searchPlaceholder="Search material title..."
        filters={[
          { key: "status", label: "Status", options: ["draft", "published", "archived"].map((value) => ({ value, label: titleCase(value) })) },
          { key: "document_type", label: "Type", options: ["guide", "manual", "reference", "form", "video"].map((value) => ({ value, label: titleCase(value) })) },
        ]}
        defaults={{ status: "draft", document_type: "guide" }}
        fields={[
          { name: "title", label: "Material Title", required: true, colSpan: 2 },
          { name: "description", label: "Description", type: "textarea", colSpan: 2 },
          {
            name: "program_id",
            label: "Program",
            type: "select",
            required: true,
            options: programs.data?.map((program) => ({ value: program.id, label: `${program.code} — ${program.name}` })) ?? [],
          },
          {
            name: "training_module_id",
            label: "Module",
            type: "select",
            options: modules.data?.map((module) => ({ value: module.id, label: `${module.code} — ${module.title}` })) ?? [],
          },
          {
            name: "document_type",
            label: "Document Type",
            type: "select",
            options: ["guide", "manual", "reference", "form", "video"].map((value) => ({ value, label: titleCase(value) })),
          },
          {
            name: "status",
            label: "Publication Status",
            type: "select",
            options: ["draft", "published", "archived"].map((value) => ({ value, label: titleCase(value) })),
          },
          { name: "file", label: "File", type: "file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.txt", hint: "PDF, Office documents, images or video up to 20MB.", colSpan: 2 },
        ]}
        transformForm={(values) => {
          const form = new FormData();
          Object.entries(values).forEach(([key, value]) => {
            if (key === "id" || value === undefined || value === null || value === "") return;
            if (value instanceof File) form.append(key, value);
            else if (typeof value === "boolean") form.append(key, value ? "1" : "0");
            else form.append(key, String(value));
          });
          return form;
        }}
        formTitle={{ create: "Upload Training Material", edit: "Edit Training Material" }}
        columns={[
          { key: "title", label: "Title" },
          { key: "document_type", label: "Type", render: (row) => titleCase(String(row.document_type)) },
          { key: "program", label: "Program", render: (row) => (row.program as { name?: string } | null)?.name ?? "—" },
          { key: "module", label: "Module", render: (row) => (row.module as { title?: string } | null)?.title ?? "—" },
          { key: "uploader", label: "Uploaded By", render: (row) => (row.uploader as { name?: string } | null)?.name ?? "—" },
          { key: "created_at", label: "Uploaded", render: (row) => formatDate(String(row.created_at)) },
          { key: "status", label: "Status", render: (row) => <Badge status={String(row.status)}>{titleCase(String(row.status))}</Badge> },
        ]}
        rowActions={(row, { edit, remove }) => (
          <>
            {Boolean(row.file_path) && (
              <Button size="sm" variant="secondary" onClick={() => downloadFile(`/api/v1/materials/${row.id}/download`, String(row.original_filename ?? "material"))}>
                Download
              </Button>
            )}
            {can("materials.manage") && <Button size="sm" variant="ghost" onClick={() => edit(row)}>Edit</Button>}
            {can("materials.manage") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row)}>Archive</Button>}
          </>
        )}
      />
    </DashboardLayout>
  );
}
