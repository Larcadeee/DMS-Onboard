"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatTime, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface SessionRow {
  id: number;
  title: string;
  description?: string;
  session_type: string;
  delivery_mode: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  status: string;
  program?: string;
  module?: string;
  participants_count?: number;
  present_count?: number;
  training_module?: { title: string };
}

interface ModuleOption {
  id: number;
  code: string;
  title: string;
}

const emptyForm = {
  training_module_id: "",
  title: "",
  description: "",
  session_type: "classroom",
  delivery_mode: "onsite",
  starts_at: "",
  ends_at: "",
  location: "",
  capacity: "",
  status: "scheduled",
  program_id: "",
};

export default function SchedulePage() {
  const { can } = useAuth();
  const toast = useToast();
  const manage = can("sessions.manage");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [programId, setProgramId] = useState("");
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<SessionRow | null>(null);

  const debounced = useDebounced(search);
  const list = useApi<Paginated<SessionRow>>(`/api/v1/sessions${query({ search: debounced, status, program_id: programId, page })}`);
  const summary = useApi<Record<string, number>>("/api/v1/sessions/summary");
  const programs = useApi<Array<{ id: number; name: string; code: string }>>("/api/v1/lookups/programs");
  const modules = useApi<ModuleOption[]>("/api/v1/lookups/modules");

  const monthSessions = useMemo(() => list.data?.data ?? [], [list.data]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells: Array<{ date: Date | null; sessions: SessionRow[] }> = [];

    for (let i = 0; i < startDay; i += 1) cells.push({ date: null, sessions: [] });

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      const sessions = monthSessions.filter((session) => new Date(session.starts_at).toDateString() === date.toDateString());
      cells.push({ date, sessions });
    }

    return cells;
  }, [month, monthSessions]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(session: SessionRow) {
    setEditing(session);
    setForm({
      training_module_id: String((session as unknown as { training_module_id?: number }).training_module_id ?? ""),
      title: session.title,
      description: session.description ?? "",
      session_type: session.session_type,
      delivery_mode: session.delivery_mode,
      starts_at: session.starts_at.slice(0, 16),
      ends_at: session.ends_at.slice(0, 16),
      location: session.location ?? "",
      capacity: String((session as unknown as { capacity?: number }).capacity ?? ""),
      status: session.status,
      program_id: "",
    });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editing) {
        await api.put(`/api/v1/sessions/${editing.id}`, form);
        toast.notify("Training session updated.");
      } else {
        await api.post("/api/v1/sessions", form);
        toast.notify("Training session scheduled.");
      }

      setOpen(false);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save session.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(session: SessionRow, action: "cancel" | "complete") {
    try {
      await api.post(`/api/v1/sessions/${session.id}/${action}`);
      toast.notify(action === "cancel" ? "Session cancelled." : "Session completed.");
      setViewing(null);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update session.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Training Schedule"
          description="Plan and monitor onboarding training sessions and activities."
          breadcrumb="Training Management"
          actions={manage ? <Button onClick={openCreate}>Schedule Session</Button> : undefined}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Today's Sessions" value={summary.data?.today ?? "—"} />
          <StatCard title="Upcoming Sessions" value={summary.data?.upcoming ?? "—"} tone="sky" />
          <StatCard title="Completed Sessions" value={summary.data?.completed ?? "—"} tone="emerald" />
          <StatCard title="Cancelled / Rescheduled" value={summary.data?.cancelled ?? "—"} tone="amber" />
        </div>

        <Card title="Session Calendar" description={`${month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}`}
          actions={
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</Button>
              <Button size="sm" variant="secondary" onClick={() => setMonth(new Date())}>Today</Button>
              <Button size="sm" variant="secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, index) => (
              <div key={index} className={`min-h-20 rounded-lg border p-1.5 ${cell.date ? "bg-white" : "bg-slate-50"}`}>
                {cell.date && <p className="text-xs text-slate-500">{cell.date.getDate()}</p>}
                {cell.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setViewing(session)}
                    className="mt-1 block w-full truncate rounded bg-slate-900 px-1.5 py-1 text-left text-[10px] text-white"
                    title={session.title}
                  >
                    {formatTime(session.starts_at)} {session.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search session title..." />
            <Select value={programId} onChange={(e) => { setProgramId(e.target.value); setPage(1); }} className="w-52">
              <option value="">All programs</option>
              {programs.data?.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
              <option value="">All statuses</option>
              {["scheduled", "completed", "cancelled", "rescheduled"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "title", label: "Session", render: (row) => <button type="button" onClick={() => setViewing(row)} className="font-medium text-slate-900 hover:underline">{row.title}</button> },
              { key: "module", label: "Module", render: (row) => row.module ?? row.training_module?.title ?? "—" },
              { key: "starts_at", label: "Schedule", render: (row) => `${formatDate(row.starts_at)} ${formatTime(row.starts_at)}` },
              { key: "location", label: "Venue", render: (row) => row.location ?? "—" },
              { key: "participants", label: "Participants", render: (row) => `${row.present_count ?? 0} / ${row.participants_count ?? 0}` },
              { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
            ]}
            emptyTitle="No sessions scheduled"
            emptyAction={manage ? <Button size="sm" onClick={openCreate}>Schedule Session</Button> : undefined}
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title={editing ? "Edit Training Session" : "Schedule Training Session"} onClose={() => setOpen(false)} wide
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="session-form" disabled={saving}>{saving ? "Saving..." : "Save Session"}</Button></>}
      >
        <form id="session-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Field label="Session Title" required><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Training Module" required>
            <Select required value={form.training_module_id} onChange={(e) => setForm({ ...form, training_module_id: e.target.value })}>
              <option value="">Select module...</option>
              {modules.data?.map((module) => <option key={module.id} value={module.id}>{module.code} — {module.title}</option>)}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Session Type">
            <Select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
              {["classroom", "practical", "scenario", "online", "field"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Delivery Mode">
            <Select value={form.delivery_mode} onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })}>
              {["onsite", "online", "hybrid"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Starts At" required><Input type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Ends At" required><Input type="datetime-local" required value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
          <Field label="Venue / Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
          {!editing && (
            <Field label="Auto-assign Participants" hint="Adds active trainees of the selected program to this session.">
              <Select value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
                <option value="">All active enrollments</option>
                {programs.data?.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["scheduled", "completed", "cancelled", "rescheduled"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.title ?? "Session"} onClose={() => setViewing(null)}
        footer={
          viewing && (
            <>
              <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
              <Link href={`/attendance?session=${viewing.id}`}><Button variant="secondary">Attendance</Button></Link>
              {manage && <Button variant="secondary" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button>}
              {manage && viewing.status === "scheduled" && <Button onClick={() => changeStatus(viewing, "complete")}>Mark completed</Button>}
              {manage && viewing.status === "scheduled" && <Button variant="danger" onClick={() => changeStatus(viewing, "cancel")}>Cancel session</Button>}
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-2 text-sm text-slate-700">
            <p>{viewing.description ?? "No description provided."}</p>
            <p><span className="font-medium">Module:</span> {viewing.module ?? viewing.training_module?.title ?? "—"}</p>
            <p><span className="font-medium">Program:</span> {viewing.program ?? "—"}</p>
            <p><span className="font-medium">Schedule:</span> {formatDateTime(viewing.starts_at)} – {formatTime(viewing.ends_at)}</p>
            <p><span className="font-medium">Venue:</span> {viewing.location ?? "TBA"}</p>
            <p><span className="font-medium">Participants:</span> {viewing.participants_count ?? 0}</p>
            <div><Badge status={viewing.status}>{titleCase(viewing.status)}</Badge></div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
