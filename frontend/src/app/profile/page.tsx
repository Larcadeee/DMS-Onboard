"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, type AuthUser } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Button, Card, DetailRow, Field, Input, PageHeader, StatCard } from "@/components/ui/Primitives";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];

interface ProfileUser extends AuthUser {
  role: { id: number; name: string; slug: string } | null;
}

export default function ProfilePage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<{ user: ProfileUser }>("/api/v1/profile");
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", email: "", contact_number: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!data?.user) return;
    setProfile(data.user);
    setForm({
      first_name: data.user.first_name ?? "",
      middle_name: data.user.middle_name ?? "",
      last_name: data.user.last_name ?? "",
      email: data.user.email,
      contact_number: data.user.contact_number ?? "",
    });
  }, [data]);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const displayName = useMemo(
    () => [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ").trim() || profile?.name || "User",
    [form.first_name, form.middle_name, form.last_name, profile?.name]
  );

  function choosePhoto(file?: File) {
    setFormError("");
    setSuccess("");

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setFormError("Profile photos must be a JPG, JPEG, or PNG image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setFormError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setPhoto(file);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      const payload = new FormData();
      payload.append("first_name", form.first_name.trim());
      payload.append("middle_name", form.middle_name.trim());
      payload.append("last_name", form.last_name.trim());
      payload.append("email", form.email.trim());
      payload.append("contact_number", form.contact_number.trim());

      if (photo) {
        payload.append("profile_photo", photo);
      }

      const result = await api.post<{ message: string; user: ProfileUser }>("/api/v1/profile", payload);
      setProfile(result.user);
      setPhoto(null);
      if (fileInput.current) fileInput.current.value = "";
      setSuccess("Your profile has been updated.");
      toast.notify("Profile updated successfully.");
      await refresh();
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    if (!window.confirm("Remove your current profile photo?")) return;

    setRemoving(true);
    setFormError("");
    setSuccess("");

    try {
      const result = await api.delete<{ message: string; user: ProfileUser }>("/api/v1/profile/photo");
      setProfile(result.user);
      setPhoto(null);
      if (fileInput.current) fileInput.current.value = "";
      setSuccess("Your profile photo has been removed.");
      await refresh();
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to remove your profile photo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Profile"
          description="Manage your personal information and profile photo."
          breadcrumb="Workspace"
          actions={<Link href="/change-password" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Change Password</Link>}
        />

        {loading && <Card><p className="text-sm text-slate-500">Loading profile...</p></Card>}
        {error && <Card><p className="text-sm text-red-600">{error}</p></Card>}

        {profile && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Role" value={profile.role?.name ?? "—"} />
              <StatCard title="Permissions" value={profile.permissions.length} tone="sky" />
              <StatCard title="Unread Notifications" value={profile.unread_notifications} tone="violet" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Profile Photo" description="JPG, JPEG or PNG · maximum 5 MB.">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Avatar src={preview ?? profile.avatar_url} name={displayName} size="lg" />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => choosePhoto(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                      {profile.avatar_url || preview ? "Replace Photo" : "Upload Photo"}
                    </Button>
                    {profile.avatar_url && !photo && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={removePhoto} disabled={removing}>
                        {removing ? "Removing..." : "Remove Photo"}
                      </Button>
                    )}
                    {photo && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setPhoto(null); if (fileInput.current) fileInput.current.value = ""; }}>
                        Cancel Selection
                      </Button>
                    )}
                  </div>
                  {photo && <p className="text-xs text-slate-500">New photo selected. Save changes to apply.</p>}
                </div>
              </Card>

              <Card title="Personal Information" className="lg:col-span-2">
                <form onSubmit={save} className="space-y-4">
                  {(formError || success) && (
                    <div className={`rounded-lg p-3 text-sm ${formError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} role="status">
                      {formError || success}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="First Name" required>
                      <Input required maxLength={100} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </Field>
                    <Field label="Middle Name">
                      <Input maxLength={100} value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                    </Field>
                    <Field label="Last Name" required>
                      <Input required maxLength={100} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email Address" required hint="Used for signing in to the system.">
                      <Input required type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Field label="Contact Number">
                      <Input
                        maxLength={50}
                        placeholder="e.g. +63 917 555 1234"
                        value={form.contact_number}
                        onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="secondary" onClick={() => { setForm({
                      first_name: profile.first_name ?? "",
                      middle_name: profile.middle_name ?? "",
                      last_name: profile.last_name ?? "",
                      email: profile.email,
                      contact_number: profile.contact_number ?? "",
                    }); setPhoto(null); setFormError(""); setSuccess(""); }}>
                      Reset
                    </Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Account Details">
                <dl className="divide-y">
                  <DetailRow label="Role" value={profile.role?.name ?? "—"} />
                  <DetailRow label="Account status" value={<Badge status={profile.is_active ? "active" : "inactive"}>{profile.is_active ? "Active" : "Inactive"}</Badge>} />
                  <DetailRow label="Last login" value={formatDateTime(profile.last_login_at)} />
                </dl>
                <p className="mt-3 text-xs text-slate-400">
                  Role, permissions, account status and employment details are managed by administrators and cannot be changed here.
                </p>
              </Card>

              <Card title="Access Permissions" description="Capabilities granted to your role.">
                <div className="flex flex-wrap gap-1.5">
                  {profile.permissions.map((permission) => (
                    <span key={permission} className="rounded-full border bg-slate-50 px-2.5 py-0.5 font-mono text-xs text-slate-600">{permission}</span>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
