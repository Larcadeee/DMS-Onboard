"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Card, Input, Modal, PageHeader, Pagination, SearchInput, Select } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface AuditLog {
  id: number;
  action: string;
  subject_type?: string;
  subject_id?: number;
  description?: string;
  properties?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: { name: string; email: string };
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const debounced = useDebounced(search);
  const list = useApi<Paginated<AuditLog>>(
    `/api/v1/audit-logs${query({ search: debounced, action, module, date_from: from || undefined, date_to: to || undefined, page })}`
  );

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Audit Logs"
          description="Immutable record of account, onboarding and evaluation activity."
          breadcrumb="Administration"
        />

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search action or description..." />
            <Input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Action prefix" className="w-44" />
            <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="w-44">
              <option value="">All modules</option>
              {["User", "Role", "Trainee", "Program", "Enrollment", "Assessment", "CompetencyEvaluation", "TrainingSession", "Setting"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "created_at", label: "Timestamp", render: (row) => formatDateTime(row.created_at) },
              { key: "user", label: "User", render: (row) => <div><p className="font-medium">{row.user?.name ?? "System"}</p><p className="text-xs text-slate-400">{row.user?.email}</p></div> },
              { key: "action", label: "Action", render: (row) => <span className="font-mono text-xs">{row.action}</span> },
              { key: "subject", label: "Subject", render: (row) => row.subject_type ? `${row.subject_type}${row.subject_id ? ` #${row.subject_id}` : ""}` : "—" },
              { key: "description", label: "Description", className: "max-w-md truncate", render: (row) => row.description ?? "—" },
              { key: "ip", label: "IP Address", render: (row) => row.ip_address ?? "—" },
              { key: "actions", label: "", render: (row) => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>Details</Button> },
            ]}
            emptyTitle="No audit entries"
            emptyDescription="Activity is recorded automatically as users work in the system."
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={Boolean(selected)} title="Audit Entry" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Badge status="active">{selected.action}</Badge><span className="text-xs text-slate-500">{formatDateTime(selected.created_at)}</span></div>
            <p className="text-slate-700">{selected.description ?? "No description recorded."}</p>
            <dl className="divide-y rounded-lg border text-sm">
              <div className="flex justify-between gap-4 px-3 py-2"><dt className="text-slate-500">User</dt><dd>{selected.user ? `${selected.user.name} (${selected.user.email})` : "System"}</dd></div>
              <div className="flex justify-between gap-4 px-3 py-2"><dt className="text-slate-500">Subject</dt><dd>{selected.subject_type ?? "—"} {selected.subject_id ?? ""}</dd></div>
              <div className="flex justify-between gap-4 px-3 py-2"><dt className="text-slate-500">IP address</dt><dd className="font-mono text-xs">{selected.ip_address ?? "—"}</dd></div>
              <div className="flex justify-between gap-4 px-3 py-2"><dt className="text-slate-500">User agent</dt><dd className="max-w-sm truncate text-xs">{selected.user_agent ?? "—"}</dd></div>
            </dl>
            {selected.properties && Object.keys(selected.properties).length > 0 && (
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(selected.properties, null, 2)}</pre>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
