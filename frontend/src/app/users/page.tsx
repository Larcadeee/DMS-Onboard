"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select } from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";

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
  must_change_password: boolean;
  last_login_at?: string;
  created_at?: string;
  role?: { id: number; name: string; slug: string };
}

interface Role { id: number; name: string; slug: string }

const blank = { first_name: "", middle_name: "", last_name: "", contact_number: "", email: "", role_id: "", password: "", password_confirmation: "" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export default function UsersPage() {
  const { can, user: currentUser } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>(blank);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetForm, setResetForm] = useState({ password: "", password_confirmation: "" });
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const debounced = useDebounced(search);
  const list = useApi<Paginated<UserRow>>(`/api/v1/users${query({ search: debounced, page })}`);
  const roles = useApi<Role[]>("/api/v1/lookups/roles");

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setActive(true);
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
    setActive(row.is_active);
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
      setError("Profile photos must be a JPG, JPEG, or PNG image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
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
          is_active: active,
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

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="User Account Management"
          description="Create and maintain staff and administrator accounts."
          breadcrumb="Administration"
          actions={can("users.create") ? <Button onClick={openCreate}>Add User</Button> : undefined}
        />

        <Card>
          <div className="mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." />
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
                      <p className="font-medium">{row.name}{row.id === currentUser?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}</p>
                      <p className="text-xs text-slate-400">{row.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: "role", label: "Role", render: (row) => row.role?.name ?? "—" },
              { key: "status", label: "Status", render: (row) => <Badge status={row.is_active ? "active" : "inactive"}>{row.is_active ? "Active" : "Inactive"}</Badge> },
              { key: "password", label: "Password", render: (row) => row.must_change_password ? <Badge status="pending">Change required</Badge> : "Set" },
              { key: "last_login", label: "Last Login", render: (row) => formatDateTime(row.last_login_at) },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex gap-1">
                    {can("users.update") && <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>}
                    {can("users.reset_password") && <Button size="sm" variant="ghost" onClick={() => { setResetFor(row); setResetError(""); }}>Reset Password</Button>}
                  </div>
                ),
              },
            ]}
            emptyTitle="No user accounts"
          />

          <div className="mt-4 border-t pt-3">
            <Pagination page={list.data?.current_page ?? 1} lastPage={list.data?.last_page ?? 1} total={list.data?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      </div>

      <Modal open={open} title={editing ? "Edit User" : "Add User"} onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="user-form" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
      >
        <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <Avatar src={photoPreview ?? editing?.avatar_url} name={[form.first_name, form.last_name].filter(Boolean).join(" ") || editing?.name} size="md" />
            <div>
              <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => choosePhoto(e.target.files?.[0])} className="text-xs" />
              <p className="mt-1 text-xs text-slate-400">Optional. JPG, JPEG or PNG, maximum 5 MB.</p>
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
          {editing && (
            <Field label="Account Status">
              <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </Field>
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
        footer={<><Button variant="secondary" onClick={() => setResetFor(null)}>Cancel</Button><Button type="submit" form="reset-form" disabled={resetting}>{resetting ? "Resetting..." : "Reset Password"}</Button></>}
      >
        <form id="reset-form" onSubmit={resetPassword} className="space-y-4">
          {resetError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{resetError}</p>}
          <p className="text-sm text-slate-600">The user will be signed out of all devices and required to change this password on next login.</p>
          <Field label="New Password" required hint="Minimum 12 characters with upper/lowercase letters and numbers.">
            <Input required type="password" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} />
          </Field>
          <Field label="Confirm New Password" required>
            <Input required type="password" value={resetForm.password_confirmation} onChange={(e) => setResetForm({ ...resetForm, password_confirmation: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
