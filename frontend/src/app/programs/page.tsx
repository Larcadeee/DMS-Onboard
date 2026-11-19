"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ResourcePage } from "@/components/ui/ResourcePage";
import { Badge, Button } from "@/components/ui/Primitives";
import { useAuth } from "@/lib/auth";
import { formatDate, titleCase } from "@/lib/format";


export default function ProgramsPage() {
  const { can } = useAuth();

  return (
    <DashboardLayout>
      <ResourcePage
        title="Onboarding Programs"
        description="Create and manage onboarding programs, durations and curriculum versions."
        breadcrumb="Training Management"
        endpoint="/api/v1/programs"
        summaryEndpoint="/api/v1/programs/summary"
        summaryCards={[
          { key: "total", title: "Total Programs" },
          { key: "active", title: "Active Programs" },
          { key: "draft", title: "Draft Programs" },
          { key: "archived", title: "Archived Programs" },
        ]}
        canManage={can("programs.create")}
        createLabel="Add Program"
        searchPlaceholder="Search program name or code..."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
        defaults={{ status: "draft", is_active: true, create_default_curriculum: true }}
        fields={[
          { name: "code", label: "Program Code", required: true, placeholder: "ETC-ONB-2026" },
          { name: "name", label: "Program Name", required: true },
          { name: "description", label: "Description", type: "textarea", colSpan: 2 },
          { name: "objectives", label: "Program Objectives", type: "textarea", colSpan: 2 },
          { name: "target_participants", label: "Target Participants", type: "textarea", colSpan: 2 },
          { name: "duration_days", label: "Expected Duration (days)", type: "number" },
          { name: "start_date", label: "Start Date", type: "date" },
          { name: "end_date", label: "End Date", type: "date" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ],
          },
          { name: "create_default_curriculum", label: "Create default curriculum version and orientation phase", type: "checkbox", colSpan: 2 },
        ]}
        formTitle={{ create: "Add Onboarding Program", edit: "Edit Onboarding Program" }}
        deleteConfirmation="Archiving a program disables new assignments. Programs with active trainees require resolution first."
        columns={[
          { key: "code", label: "Code", render: (row) => <span className="font-mono text-xs">{String(row.code)}</span> },
          {
            key: "name",
            label: "Program",
            render: (row) => (
              <Link href={`/programs/${row.id}`} className="font-medium text-slate-900 hover:underline">
                {String(row.name)}
              </Link>
            ),
          },
          { key: "duration_days", label: "Duration", render: (row) => (row.duration_days ? `${row.duration_days} days` : "—") },
          { key: "phases", label: "Phases", render: (row) => String(row.phases ?? 0) },
          { key: "trainees", label: "Trainees", render: (row) => String(row.trainees ?? 0) },
          { key: "status", label: "Status", render: (row) => <Badge status={String(row.status)}>{titleCase(String(row.status))}</Badge> },
          { key: "start_date", label: "Start", render: (row) => formatDate(row.start_date as string) },
        ]}
        rowActions={(row, { edit, remove }) => (
          <>
            <Link href={`/programs/${row.id}`}><Button size="sm" variant="secondary">View</Button></Link>
            {can("programs.update") && <Button size="sm" variant="ghost" onClick={() => edit(row)}>Edit</Button>}
            {can("programs.update") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row)}>Archive</Button>}
          </>
        )}
      />
    </DashboardLayout>
  );
}
