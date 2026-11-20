"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingSkeleton,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
} from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface AttendanceRow {
  id: number;
  attendance_status: string;
  remarks?: string;
  date?: string;
  session?: string;
  trainee?: string;
  trainee_number?: string;
  program?: string;
  trainer?: string;
  enrollment_id: number;
  training_session_id: number;
}

interface SheetRecord {
  id: number;
  enrollment_id: number;
  attendance_status: string;
  remarks?: string;
  enrollment?: { trainee?: { first_name: string; last_name: string; trainee_number: string } };
}

interface SessionSheet {
  session: {
    id: number;
    title: string;
    starts_at: string;
    location?: string;
    attendances: SheetRecord[];
  };
}

const statuses = ["present", "absent", "late", "excused"];

export default function AttendancePage() {
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [programId, setProgramId] = useState("");
  const [page, setPage] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chosenSession, setChosenSession] = useState("");
  const [records, setRecords] = useState<Record<number, { status: string; remarks: string }>>({});
  const [saving, setSaving] = useState(false);

  const list = useApi<Paginated<AttendanceRow>>(`/api/v1/attendance${query({ search, status, program_id: programId, page })}`);
  const summary = useApi<Record<string, number>>("/api/v1/attendance/summary");
  const programs = useApi<Array<{ id: number; name: string }>>("/api/v1/lookups/programs");
  const sheet = useApi<SessionSheet>(sessionId ? `/api/v1/sessions/${sessionId}/attendance` : null);
  const sessions = useApi<Paginated<{ id: number; title: string; starts_at: string; status: string }>>(
    chooserOpen ? "/api/v1/sessions?per_page=100" : null
  );

  useEffect(() => {
    const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("session") : null;
    if (requested) setSessionId(requested);
  }, []);

  useEffect(() => {
    if (!sheet.data) return;
    const next: Record<number, { status: string; remarks: string }> = {};
    sheet.data.session.attendances.forEach((record) => {
      next[record.enrollment_id] = { status: record.attendance_status, remarks: record.remarks ?? "" };
    });
    setRecords(next);
  }, [sheet.data]);

  async function saveSheet() {
    if (!sessionId) return;
    setSaving(true);

    try {
      await api.put(`/api/v1/sessions/${sessionId}/attendance`, {
        records: Object.entries(records).map(([enrollmentId, record]) => ({
          enrollment_id: Number(enrollmentId),
          attendance_status: record.status,
          remarks: record.remarks || null,
        })),
      });
      toast.notify("Attendance saved successfully.");
      setSessionId(null);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to save attendance.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Attendance Management"
          description="Record and monitor trainee attendance during scheduled training sessions."
          breadcrumb="Training Management"
          actions={<Button onClick={() => { setChosenSession(""); setChooserOpen(true); }}>Record attendance</Button>}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard loading={summary.loading} title="Attendance Records" value={summary.data?.total ?? "—"} />
          <StatCard loading={summary.loading} title="Present" value={summary.data?.present ?? "—"} tone="accent" />
          <StatCard loading={summary.loading} title="Absent" value={summary.data?.absent ?? "—"} tone="danger" />
          <StatCard loading={summary.loading} title="Late / Excused" value={Number(summary.data?.late ?? 0) + Number(summary.data?.excused ?? 0)} tone="warning" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search session or trainee..." />
            <Select value={programId} onChange={(e) => { setProgramId(e.target.value); setPage(1); }} className="w-52">
              <option value="">All programs</option>
              {programs.data?.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "session", label: "Session", render: (row) => row.session ?? "—" },
              { key: "trainee", label: "Trainee", render: (row) => <div><p className="font-medium">{row.trainee}</p><p className="text-xs text-slate-400">{row.trainee_number}</p></div> },
              { key: "program", label: "Program", render: (row) => row.program ?? "—" },
              { key: "trainer", label: "Trainer", render: (row) => row.trainer ?? "—" },
              { key: "status", label: "Attendance", render: (row) => <Badge status={row.attendance_status}>{titleCase(row.attendance_status)}</Badge> },
              { key: "remarks", label: "Remarks", render: (row) => row.remarks ?? "—" },
            ]}
            emptyTitle="No attendance records"
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal
        open={chooserOpen}
        title="Select training session"
        description="Choose the session whose attendance sheet you want to record."
        onClose={() => setChooserOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setChooserOpen(false)}>Cancel</Button>
            <Button
              disabled={!chosenSession}
              onClick={() => {
                setSessionId(chosenSession);
                setChooserOpen(false);
              }}
            >
              Open attendance sheet
            </Button>
          </>
        }
      >
        {sessions.loading && <LoadingSkeleton rows={4} />}
        {sessions.error && <ErrorState message={sessions.error} onRetry={sessions.refetch} />}
        {sessions.data && (
          <Field label="Training session" required hint="Scheduled and recent sessions are listed by date.">
            <Select value={chosenSession} onChange={(event) => setChosenSession(event.target.value)}>
              <option value="">Select a session...</option>
              {sessions.data.data.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDate(session.starts_at)} · {session.title} ({titleCase(session.status)})
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Modal>

      <Modal open={Boolean(sessionId)} title="Record session attendance" onClose={() => setSessionId(null)} wide
        footer={<><Button variant="secondary" onClick={() => setSessionId(null)}>Cancel</Button>{can("attendance.manage") && <Button onClick={saveSheet} loading={saving}>{saving ? "Saving attendance" : "Save attendance"}</Button>}</>}
      >
        {sheet.loading && <LoadingSkeleton rows={5} />}
        {sheet.error && <ErrorState message={sheet.error} onRetry={sheet.refetch} />}
        {sheet.data && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{sheet.data.session.title}</p>
              <p className="text-xs text-slate-500">{formatDateTime(sheet.data.session.starts_at)} · {sheet.data.session.location ?? "Venue TBA"}</p>
            </div>

            <div className="space-y-2">
              {sheet.data.session.attendances.length === 0 && <p className="text-sm text-slate-500">No participants assigned to this session.</p>}
              {sheet.data.session.attendances.map((record) => {
                const trainee = record.enrollment?.trainee;
                const current = records[record.enrollment_id] ?? { status: record.attendance_status, remarks: "" };
                return (
                  <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{trainee ? `${trainee.first_name} ${trainee.last_name}` : "Trainee"}</p>
                      <p className="text-xs text-slate-400">{trainee?.trainee_number}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={current.status}
                        onChange={(e) => setRecords({ ...records, [record.enrollment_id]: { ...current, status: e.target.value } })}
                        className="w-36"
                      >
                        <option value="unmarked">Unmarked</option>
                        {statuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                      </Select>
                      <Field label="" className="w-48">
                        <Input
                          placeholder="Remarks"
                          value={current.remarks}
                          onChange={(e) => setRecords({ ...records, [record.enrollment_id]: { ...current, remarks: e.target.value } })}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
