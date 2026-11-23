"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { ActionIcon, Badge, Button, Card, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Textarea } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";

type AccountStatus = "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE";

interface UserRow {
  id: number;
  name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  contact_number?: string | null;
  avatar_url?: string | null;
  email: string;
  is_active: boolean;
  account_status: AccountStatus;
  status_reason?: string | null;
  approved_at?: string | null;
  approver?: { id: number; name: string } | null;
  must_change_password: boolean;
  last_login_at?: string;
  created_at?: string;
  role?: { id: number; name: string; slug: string };
}

interface Role { id: number; name: string; slug: string }

type PendingAction = "reject" | "deactivate" | "delete" | null;

const blank = { first_name: "", middle_name: "", last_name: "", contact_number: "", email: "", role_id: "", password: "", password_confirmation: "" };
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending approval" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function UsersPage() {
  const router = useRouter();
  const { can, user: currentUser } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetForm, setResetForm] = useState({ password: "", password_confirmation: "" });
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [confirmFor, setConfirmFor] = useState<UserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const debounced = useDebounced(search);
  const list = useApi<Paginated<UserRow>>(
    `/api/v1/users${query({ search: debounced, status: statusFilter, role_id: roleFilter, page })}`
  );
  const pending = useApi<Paginated<UserRow>>("/api/v1/users?status=PENDING&per_page=1");
  const roles = useApi<Role[]>("/api/v1/lookups/roles");

  const pendingCount = pending.data?.total ?? 0;

  function resetFilters() {
    setStatusFilter("");
    setRoleFilter("");
    setSearch("");
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setError("");
    setPhoto(null);
    setPhotoPreview(null);
    setOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setForm({
      first_name: row.first_name ?? "",
      middle_name: row.middle_name ?? "",
      last_name: row.last_name ?? "",
      contact_number: row.contact_number ?? "",
      email: row.email,
      role_id: String(row.role?.id ?? ""),
      password: "",
      password_confirmation: "",
    });
    setError("");
    setPhoto(null);
    setPhotoPreview(null);
    setOpen(true);
  }

  function choosePhoto(file?: File) {
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Profile photos must be a JPG, JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError("Profile photos must be 2 MB or smaller.");
      return;
    }

    setError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function removePhoto() {
    if (!editing) return;
    if (!window.confirm("Remove this user's profile photo?")) return;

    setRemovingPhoto(true);
    setError("");

    try {
      await api.delete<{ user: UserRow }>(`/api/v1/users/${editing.id}/photo`);
      setEditing({ ...editing, avatar_url: null });
      setPhoto(null);
      setPhotoPreview(null);
      toast.notify("Profile photo removed.");
      await list.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove profile photo.");
    } finally {
      setRemovingPhoto(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ").trim();
    const profileFields = {
      name,
      first_name: form.first_name,
      middle_name: form.middle_name,
      last_name: form.last_name,
      contact_number: form.contact_number,
    };

    try {
      let userId = editing?.id;

      if (editing) {
        await api.put(`/api/v1/users/${editing.id}`, {
          ...profileFields,
          email: form.email,
          role_id: Number(form.role_id),
        });
      } else {
        const created = await api.post<{ user: UserRow }>("/api/v1/users", {
          ...profileFields,
          email: form.email,
          role_id: Number(form.role_id),
          password: form.password,
          password_confirmation: form.password_confirmation,
        });
        userId = created.user.id;
      }

      if (photo && userId) {
        const payload = new FormData();
        payload.append("profile_photo", photo);
        await api.post(`/api/v1/users/${userId}/photo`, payload);
      }

      toast.notify(editing ? "User updated." : "User account created. They must change the password on first login.");
      setOpen(false);
      setPhoto(null);
      setPhotoPreview(null);
      await list.refetch();
      await pending.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetFor) return;
    setResetting(true);
    setResetError("");

    try {
      await api.post(`/api/v1/users/${resetFor.id}/reset-password`, resetForm);
      toast.notify("Password reset. The user must change it upon next login.");
      setResetFor(null);
      setResetForm({ password: "", password_confirmation: "" });
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setResetting(false);
    }
  }

  async function runStatusAction(row: UserRow, action: "approve" | "activate" | "deactivate" | "delete") {
    setActionBusy(true);
    setActionError("");

    try {
      if (action === "approve") {
        await api.post(`/api/v1/users/${row.id}/approve`);
        toast.notify(`${row.name}'s account approved.`);
      } else if (action === "activate") {
        await api.post(`/api/v1/users/${row.id}/activate`);
        toast.notify(`${row.name}'s account activated.`);
      } else if (action === "deactivate") {
        await api.post(`/api/v1/users/${row.id}/deactivate`);
        toast.notify(`${row.name}'s account deactivated.`);
      } else {
        await api.delete(`/api/v1/users/${row.id}`);
        toast.notify(`${row.name}'s account deleted.`);
      }

      setConfirmFor(null);
      setPendingAction(null);
      setRejectReason("");
      await list.refetch();
      await pending.refetch();

      if (row.id === currentUser?.id) {
        router.replace("/login");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to complete this action.");
    } finally {
      setActionBusy(false);
    }
  }

  async function submitReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmFor) return;

    setActionBusy(true);
    setActionError("");

    try {
      await api.post(`/api/v1/users/${confirmFor.id}/reject`, { reason: rejectReason.trim() || null });
      toast.notify(`${confirmFor.name}'s registration rejected.`);
      setConfirmFor(null);
      setPendingAction(null);
      setRejectReason("");
      await list.refetch();
      await pending.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to reject this registration.");
    } finally {
      setActionBusy(false);
    }
  }

  function openConfirm(row: UserRow, action: Exclude<PendingAction, null>) {
    setConfirmFor(row);
    setPendingAction(action);
    setRejectReason("");
    setActionError("");
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="User Account Management"
          description="Review registrations, manage access and maintain staff accounts."
          breadcrumb="Administration"
          actions={can("users.create") ? <Button onClick={openCreate}><ActionIcon name="add" />Add user</Button> : undefined}
        />

        {can("users.approve") && pendingCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {pendingCount} registration{pendingCount === 1 ? "" : "s"} awaiting approval
                </p>
                <p className="text-xs text-amber-700">Approve or reject pending trainee registrations to control access.</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setStatusFilter("PENDING"); setPage(1); }}>
              Review pending
            </Button>
          </div>
        )}

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name or email..." />
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-44">
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="w-48">
              <option value="">All roles</option>
              {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>
            {(search || statusFilter || roleFilter) && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>Clear filters</Button>
            )}
          </div>

          <DataTable
            rows={list.data?.data ?? []}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            columns={[
              {
                key: "name",
                label: "User",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Avatar src={row.avatar_url} name={row.name} size="sm" />
                    <div>
                      <p className="font-medium">
                        {row.name}
                        {row.id === currentUser?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400">{row.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: "role", label: "Role", render: (row) => row.role?.name ?? "—" },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <div className="space-y-1">
                    <Badge status={row.account_status}>{STATUS_LABEL[row.account_status] ?? row.account_status}</Badge>
                    {row.account_status === "REJECTED" && row.status_reason && (
                      <p className="max-w-[220px] text-[11px] leading-4 text-slate-400" title={row.status_reason}>
                        {row.status_reason}
                      </p>
                    )}
                  </div>
                ),
              },
              { key: "password", label: "Password", render: (row) => row.must_change_password ? <Badge status="pending">Change required</Badge> : "Set" },
              { key: "last_login", label: "Last Login", render: (row) => formatDateTime(row.last_login_at) },
              {
                key: "actions",
                label: "Actions",
                render: (row) => {
                  const isSelf = row.id === currentUser?.id;
                  const isPending = row.account_status === "PENDING";
                  const isActive = row.account_status === "ACTIVE";

                  return (
                    <div className="flex flex-wrap gap-1">
                      {isPending && can("users.approve") && (
                        <>
                          <Button size="sm" onClick={() => runStatusAction(row, "approve")} title="Approve registration"><ActionIcon name="approve" />Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => openConfirm(row, "reject")} title="Reject registration"><ActionIcon name="delete" />Reject</Button>
                        </>
                      )}
                      {!isPending && can("users.update") && (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} title="Edit user"><ActionIcon name="edit" />Edit</Button>
                      )}
                      {!isPending && can("users.update") && (
                        <Button size="sm" variant="ghost" onClick={() => { setResetFor(row); setResetError(""); }}>Reset Password</Button>
                      )}
                      {!isPending && !isActive && can("users.deactivate") && (
                        <Button size="sm" variant="ghost" onClick={() => runStatusAction(row, "activate")}>Activate</Button>
                      )}
                      {isActive && !isSelf && can("users.deactivate") && (
                        <Button size="sm" variant="ghost" onClick={() => openConfirm(row, "deactivate")}>Deactivate</Button>
                      )}
                      {!isSelf && can("users.delete") && (
                        <Button size="sm" variant="ghost" onClick={() => openConfirm(row, "delete")} title="Delete user"><ActionIcon name="delete" />Delete</Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            emptyTitle="No user accounts"
            emptyDescription="Try adjusting the filters or create a new account."
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title={editing ? "Edit User" : "Add User"} onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="user-form" loading={saving}>{saving ? "Saving changes" : "Save changes"}</Button></>}
      >
        <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{error}</p>}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <Avatar src={photoPreview ?? editing?.avatar_url} name={[form.first_name, form.last_name].filter(Boolean).join(" ") || editing?.name} size="md" />
            <div>
              <Input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => choosePhoto(e.target.files?.[0])} className="text-xs" />
              <p className="mt-1 text-xs text-slate-400">Optional. JPG, JPEG, PNG or WebP, maximum 2 MB.</p>
              {editing?.avatar_url && !photo && (
                <Button type="button" variant="ghost" size="sm" className="mt-2 text-red-600" onClick={removePhoto} loading={removingPhoto}>
                  Remove current photo
                </Button>
              )}
              {photo && (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                  Cancel selection
                </Button>
              )}
            </div>
          </div>
          <Field label="First Name" required><Input required maxLength={100} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Middle Name"><Input maxLength={100} value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} /></Field>
          <Field label="Last Name"><Input maxLength={100} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          <Field label="Contact Number"><Input maxLength={50} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></Field>
          <Field label="Email" required><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role" required>
            <Select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              <option value="">Select role...</option>
              {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>
          </Field>
          {editing ? (
            <div className="sm:col-span-2 rounded-md border border-line bg-canvas px-3.5 py-2.5 text-xs leading-5 text-muted">
              Account status is <span className="font-medium text-ink">{STATUS_LABEL[editing.account_status] ?? editing.account_status}</span>. Use the row actions to approve, activate, deactivate or delete this account.
            </div>
          ) : (
            <div className="sm:col-span-2 rounded-md border border-line bg-canvas px-3.5 py-2.5 text-xs leading-5 text-muted">
              Accounts created here are active immediately and must set a new password on first sign-in.
            </div>
          )}
          {!editing && (
            <>
              <Field label="Temporary Password" required hint="Minimum 12 characters with upper/lowercase letters and numbers.">
                <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Confirm Password" required>
                <Input required type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
              </Field>
            </>
          )}
        </form>
      </Modal>

      <Modal open={Boolean(resetFor)} title={`Reset password — ${resetFor?.name ?? ""}`} onClose={() => setResetFor(null)}
        footer={<><Button variant="secondary" onClick={() => setResetFor(null)}>Cancel</Button><Button type="submit" form="reset-form" loading={resetting}>{resetting ? "Resetting password" : "Reset password"}</Button></>}
      >
        <form id="reset-form" onSubmit={resetPassword} className="space-y-4">
          {resetError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{resetError}</p>}
          <p className="text-sm text-slate-600">The user will be signed out of all devices and required to change this password on next login.</p>
          <Field label="New Password" required hint="Minimum 12 characters with upper/lowercase letters and numbers.">
            <Input required type="password" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} />
          </Field>
          <Field label="Confirm New Password" required>
            <Input required type="password" value={resetForm.password_confirmation} onChange={(e) => setResetForm({ ...resetForm, password_confirmation: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmFor) && pendingAction !== "reject"}
        title={
          pendingAction === "deactivate"
            ? "Deactivate account"
            : pendingAction === "delete"
            ? "Delete account"
            : "Confirm action"
        }
        onClose={() => { setConfirmFor(null); setActionError(""); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfirmFor(null); setActionError(""); }}>Cancel</Button>
            <Button
              loading={actionBusy}
              onClick={() => confirmFor && (pendingAction === "deactivate" || pendingAction === "delete") && runStatusAction(confirmFor, pendingAction)}
            >
              {pendingAction === "delete" ? "Delete account" : "Deactivate account"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          {actionError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{actionError}</p>}
          <p>
            {pendingAction === "delete"
              ? <>This permanently deletes <span className="font-medium text-ink">{confirmFor?.name}</span>&apos;s account. This cannot be undone.</>
              : <>This deactivates <span className="font-medium text-ink">{confirmFor?.name}</span> and signs them out of active sessions.</>}
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmFor) && pendingAction === "reject"}
        title="Reject registration"
        onClose={() => { setConfirmFor(null); setActionError(""); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfirmFor(null); setActionError(""); }}>Cancel</Button>
            <Button type="submit" form="reject-form" loading={actionBusy}>Reject registration</Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={submitReject} className="space-y-3">
          {actionError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{actionError}</p>}
          <p className="text-sm text-slate-600">
            Rejecting <span className="font-medium text-ink">{confirmFor?.name}</span> blocks sign-in until an administrator activates the account.
          </p>
          <Field label="Reason" hint="Optional. Shared with the applicant on request.">
            <Textarea rows={3} maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Incomplete requirements or duplicate registration." />
          </Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
