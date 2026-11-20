"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, ErrorState, Field, Input, Modal, PageHeader, PageLoading, SectionTitle, Textarea } from "@/components/ui/Primitives";

interface Permission { id: number; name: string; slug: string; module?: string; description?: string }
interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  users_count?: number;
  permissions: Permission[];
}

export default function RolesPage() {
  const { can, refresh } = useAuth();
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<{ roles: Role[]; permissions: Permission[] }>("/api/v1/roles");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const roles = useMemo(() => data?.roles ?? [], [data]);
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];

  useEffect(() => {
    if (!selectedId && roles.length) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  useEffect(() => {
    if (selected) setChecked(new Set(selected.permissions.map((permission) => permission.id)));
  }, [selected]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();

    for (const permission of data?.permissions ?? []) {
      const key = permission.module ?? "General";
      map.set(key, [...(map.get(key) ?? []), permission]);
    }

    return Array.from(map.entries());
  }, [data]);

  function toggle(id: number) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  function toggleModule(permissions: Permission[]) {
    const allChecked = permissions.every((permission) => checked.has(permission.id));
    const next = new Set(checked);

    for (const permission of permissions) {
      if (allChecked) next.delete(permission.id);
      else next.add(permission.id);
    }

    setChecked(next);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);

    try {
      await api.put(`/api/v1/roles/${selected.id}/permissions`, { permission_ids: Array.from(checked) });
      toast.notify("Role permissions updated.");
      await refetch();
      await refresh();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update permissions.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      await api.post("/api/v1/roles", form);
      toast.notify("Role created. Assign permissions next.");
      setOpen(false);
      setForm({ name: "", slug: "", description: "" });
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create role.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Roles &amp; Permissions"
          description="Control module access for each role. Changes apply to users immediately."
          breadcrumb="Administration"
          actions={can("roles.manage") ? <Button onClick={() => setOpen(true)}>Add Role</Button> : undefined}
        />

        {loading && <PageLoading label="Loading roles and permissions" />}
        {error && <ErrorState message={error} onRetry={refetch} />}

        {!loading && !error && (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
          <Card title="Roles" className="lg:col-span-1">
            <div className="space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${selected?.id === role.id ? "bg-ink text-white" : "hover:bg-canvas"}`}
                >
                  <span className="block font-medium">{role.name}</span>
                  <span className={`text-[11px] ${selected?.id === role.id ? "text-white/60" : "text-muted"}`}>{role.users_count ?? 0} user{(role.users_count ?? 0) === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-3" title={selected ? `${selected.name} Permissions` : "Permissions"}
            description={selected?.description ?? "Select the capabilities available to this role."}
            actions={selected && <Button onClick={save} loading={saving}>{saving ? "Saving permissions" : "Save permissions"}</Button>}
          >
            {!selected && <p className="text-sm text-slate-500">Select a role to configure permissions.</p>}
            <div className="space-y-6">
              {selected && grouped.map(([module, permissions]) => {
                const allChecked = permissions.every((permission) => checked.has(permission.id));
                return (
                  <section key={module}>
                    <div className="flex items-center justify-between">
                      <SectionTitle title={module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
                      <button type="button" onClick={() => toggleModule(permissions)} className="text-xs font-medium text-slate-500 underline">
                        {allChecked ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {permissions.map((permission) => (
                        <label key={permission.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm hover:bg-slate-50">
                          <input type="checkbox" className="mt-0.5" checked={checked.has(permission.id)} onChange={() => toggle(permission.id)} />
                          <span>
                            <span className="block font-medium text-slate-800">{permission.name}</span>
                            <span className="font-mono text-xs text-slate-400">{permission.slug}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </Card>
            </div>

            <Card title="Role Summary">
          <div className="flex flex-wrap gap-3">
            {roles.map((role) => (
              <div key={role.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{role.name} <Badge status={role.is_active ? "active" : "inactive"}>{role.is_active ? "Active" : "Inactive"}</Badge></p>
                <p className="text-xs text-slate-500">{role.permissions.length} permissions · {role.users_count ?? 0} users</p>
              </div>
            ))}
              </div>
            </Card>
          </>
        )}
      </div>

      <Modal open={open} title="Add Role" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="role-form" loading={creating}>{creating ? "Creating role" : "Create role"}</Button></>}
      >
        <form id="role-form" onSubmit={createRole} className="space-y-4">
          {formError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{formError}</p>}
          <Field label="Role Name" required><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Training Coordinator" /></Field>
          <Field label="Slug" required hint="Lowercase identifier used by the system, e.g. training_coordinator.">
            <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
