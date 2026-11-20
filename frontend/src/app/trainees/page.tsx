"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  ProgressBar,
  SearchInput,
  Select,
  StatCard,
} from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";

interface TraineeRow {
  id: number;
  trainee_number: string;
  name: string;
  avatar_url?: string | null;
  email?: string;
  status: string;
  program?: string;
  program_id?: number;
  trainer?: string;
  current_phase?: string;
  progress: number;
  employment_status?: string;
  start_date?: string;
}

const emptyForm: Record<string, string> = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  email: "",
  password: "",
  password_confirmation: "",
  trainee_number: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  employment_status: "applicant",
  trainee_status: "registered",
  program_id: "",
  trainer_id: "",
  supervisor_id: "",
  training_start_date: "",
  remarks: "",
};

export default function TraineesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [status, setStatus] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TraineeRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [archiving, setArchiving] = useState<TraineeRow | null>(null);

  const list = useApi<Paginated<TraineeRow>>(
    `/api/v1/trainees${query({ search: debounced, program_id: programId, status, trainer_id: trainerId, page })}`
  );
  const summary = useApi<Record<string, number>>("/api/v1/trainees/summary");
  const programs = useApi<Paginated<{ id: number; name: string }>>("/api/v1/programs?per_page=100");
  const staff = useApi<Array<{ id: number; name: string }>>("/api/v1/lookups/users");

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const payload: Record<string, string> = { ...form };

      if (!payload.password) {
        delete payload.password;
        delete payload.password_confirmation;
      }

      if (editing) {
        await api.put(`/api/v1/trainees/${editing.id}`, payload);
        toast.notify("Trainee updated successfully.");
      } else {
        await api.post("/api/v1/trainees", payload);
        toast.notify("Trainee registered successfully.");
      }

      setOpen(false);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save trainee.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!archiving) return;

    try {
      await api.delete(`/api/v1/trainees/${archiving.id}`);
      toast.notify("Trainee archived.");
      setArchiving(null);
      await list.refetch();
      await summary.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to archive trainee.", "error");
    }
  }

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Trainee Management"
          description="Register, monitor and manage Emergency Telecommunicator trainees."
          breadcrumb="Training Management"
          actions={can("trainees.create") ? <Button onClick={openCreate}>Add New Trainee</Button> : undefined}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard loading={summary.loading} title="Total Trainees" value={summary.data?.total ?? "—"} />
          <StatCard loading={summary.loading} title="Active Trainees" value={summary.data?.active ?? "—"} tone="accent" />
          <StatCard loading={summary.loading} title="Ongoing Training" value={summary.data?.ongoing ?? "—"} tone="default" />
          <StatCard loading={summary.loading} title="Completed Training" value={summary.data?.completed ?? "—"} tone="default" />
          <StatCard loading={summary.loading} title="Archived" value={summary.data?.archived ?? "—"} tone="warning" />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, employee no. or email..." />
            <Select value={programId} onChange={(e) => { setProgramId(e.target.value); setPage(1); }} className="w-52">
              <option value="">All programs</option>
              {programs.data?.data.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
              <option value="">All statuses</option>
              {["active", "completed", "on_hold", "registered", "archived"].map((value) => (
                <option key={value} value={value}>{titleCase(value)}</option>
              ))}
            </Select>
            <Select value={trainerId} onChange={(e) => { setTrainerId(e.target.value); setPage(1); }} className="w-48">
              <option value="">All trainers</option>
              {staff.data?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </Select>
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              { key: "trainee_number", label: "Employee No.", render: (row) => <span className="font-mono text-xs">{row.trainee_number}</span> },
              {
                key: "name",
                label: "Trainee",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Avatar src={row.avatar_url} name={row.name} size="sm" />
                    <div>
                      <Link href={`/trainees/${row.id}`} className="font-medium text-slate-900 hover:underline">{row.name}</Link>
                      <p className="text-xs text-slate-400">{row.email ?? "—"}</p>
                    </div>
                  </div>
                ),
              },
              { key: "program", label: "Program", render: (row) => row.program ?? "Not assigned" },
              { key: "trainer", label: "Trainer", render: (row) => row.trainer ?? "—" },
              { key: "start_date", label: "Start Date", render: (row) => formatDate(row.start_date) },
              { key: "current_phase", label: "Phase", render: (row) => row.current_phase ?? "—" },
              { key: "progress", label: "Progress", className: "min-w-36", render: (row) => <ProgressBar value={Number(row.progress)} /> },
              { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
            ]}
            emptyTitle="No trainees found"
            emptyDescription="Register a new trainee to begin onboarding."
            emptyAction={can("trainees.create") ? <Button size="sm" onClick={openCreate}>Add New Trainee</Button> : undefined}
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title={editing ? "Edit Trainee" : "Register New Trainee"} onClose={() => setOpen(false)} wide
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="trainee-form" loading={saving}>{saving ? "Saving trainee" : "Save trainee"}</Button>
          </>
        }
      >
        <form id="trainee-form" onSubmit={save} className="space-y-6">
          {formError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{formError}</p>}

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" required><Input required value={form.first_name} onChange={(e) => update("first_name", e.target.value)} /></Field>
              <Field label="Middle Name"><Input value={form.middle_name} onChange={(e) => update("middle_name", e.target.value)} /></Field>
              <Field label="Last Name" required><Input required value={form.last_name} onChange={(e) => update("last_name", e.target.value)} /></Field>
              <Field label="Suffix"><Input value={form.suffix} onChange={(e) => update("suffix", e.target.value)} /></Field>
              <Field label="Email Address" required><Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Contact Number"><Input value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} /></Field>
              <Field label="Sex">
                <Select value={form.sex} onChange={(e) => update("sex", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </Select>
              </Field>
              <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={(e) => update("address", e.target.value)} /></Field>
              <Field label="Emergency Contact Name"><Input value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} /></Field>
              <Field label="Emergency Contact Number"><Input value={form.emergency_contact_number} onChange={(e) => update("emergency_contact_number", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Employment Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee Number" hint="Leave blank to auto-generate"><Input value={form.trainee_number} onChange={(e) => update("trainee_number", e.target.value)} /></Field>
              <Field label="Employment Status">
                <Select value={form.employment_status} onChange={(e) => update("employment_status", e.target.value)}>
                  {["applicant", "probationary", "regular", "contractual"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                </Select>
              </Field>
              <Field label="Trainee Status">
                <Select value={form.trainee_status} onChange={(e) => update("trainee_status", e.target.value)}>
                  {["registered", "active", "on_hold", "completed", "archived"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                </Select>
              </Field>
              <Field label="Date Assigned / Training Start"><Input type="date" value={form.training_start_date} onChange={(e) => update("training_start_date", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Onboarding Assignment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Onboarding Program" required={!editing}>
                <Select required={!editing} value={form.program_id} onChange={(e) => update("program_id", e.target.value)}>
                  <option value="">Select program...</option>
                  {programs.data?.data.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </Select>
              </Field>
              <Field label="Assigned Trainer">
                <Select value={form.trainer_id} onChange={(e) => update("trainer_id", e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.data?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </Select>
              </Field>
              <Field label="Assigned Supervisor">
                <Select value={form.supervisor_id} onChange={(e) => update("supervisor_id", e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.data?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </Select>
              </Field>
              <Field label="Remarks"><Input value={form.remarks} onChange={(e) => update("remarks", e.target.value)} /></Field>
            </div>
          </section>

          {!editing && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Account Setup</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Temporary Password" hint="Minimum 12 characters, mixed case and numbers. Defaults to Trainee@123456789 if blank.">
                  <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
                </Field>
                <Field label="Confirm Password"><Input type="password" value={form.password_confirmation} onChange={(e) => update("password_confirmation", e.target.value)} /></Field>
              </div>
            </section>
          )}
        </form>
      </Modal>

      <Modal open={Boolean(archiving)} title="Archive trainee" onClose={() => setArchiving(null)}
        footer={<><Button variant="secondary" onClick={() => setArchiving(null)}>Cancel</Button><Button variant="danger" onClick={archive}>Archive Trainee</Button></>}
      >
        <p className="text-sm text-slate-600">Archiving disables the trainee account and hides them from active lists. Historical records are retained.</p>
        <p className="mt-2 font-medium text-slate-900">{archiving?.name}</p>
      </Modal>
    </DashboardLayout>
  );
}
