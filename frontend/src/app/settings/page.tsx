"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { Button, Card, Field, Input, PageHeader, Select, StatCard, Tabs } from "@/components/ui/Primitives";
import { titleCase } from "@/lib/format";

interface Setting { id: number; key: string; group: string; value: unknown }

const labels: Record<string, string> = {
  application_name: "Application Name",
  organization_name: "Organization Name",
  time_zone: "Timezone",
  date_format: "Date Format",
  attendance_threshold: "Minimum Attendance Threshold (%)",
  auto_release_results: "Automatically release assessment results",
  max_upload_size_mb: "Maximum Upload Size (MB)",
  allowed_file_types: "Allowed File Types",
  notifications_enabled: "Enable in-app notifications",
};

const groups = ["general", "onboarding", "files", "notifications"];

export default function SettingsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<{ settings: Setting[] }>("/api/v1/settings");
  const [tab, setTab] = useState("general");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues(Object.fromEntries(data.settings.map((setting) => [setting.key, setting.value])));
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);

    try {
      await api.put("/api/v1/settings", {
        settings: data.settings.map((setting) => ({
          key: setting.key,
          group: setting.group,
          value: values[setting.key],
        })),
      });
      toast.notify("Settings saved.");
      await refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  const visible = (data?.settings ?? []).filter((setting) => setting.group === tab);

  function change(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="System Settings"
          description="Configure onboarding thresholds, file uploads and notification behavior."
          breadcrumb="Administration"
          actions={<Button onClick={save} disabled={saving || loading}>{saving ? "Saving..." : "Save Settings"}</Button>}
        />

        {error && <Card><p className="text-sm text-red-600">{error}</p></Card>}

        <Tabs
          tabs={groups.map((group) => ({ value: group, label: titleCase(group) }))}
          value={tab}
          onChange={setTab}
        />

        <Card>
          {loading && <p className="text-sm text-slate-500">Loading settings...</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {visible.map((setting) => {
              const value = values[setting.key];

              if (typeof value === "boolean") {
                return (
                  <Field key={setting.key} label={labels[setting.key] ?? titleCase(setting.key)} hint={`Key: ${setting.key}`}>
                    <Select value={value ? "1" : "0"} onChange={(e) => change(setting.key, e.target.value === "1")}>
                      <option value="1">Enabled</option>
                      <option value="0">Disabled</option>
                    </Select>
                  </Field>
                );
              }

              if (Array.isArray(value)) {
                return (
                  <Field key={setting.key} label={labels[setting.key] ?? titleCase(setting.key)} hint="Comma-separated values.">
                    <Input value={value.join(", ")} onChange={(e) => change(setting.key, e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />
                  </Field>
                );
              }

              const isNumeric = typeof value === "number";

              return (
                <Field key={setting.key} label={labels[setting.key] ?? titleCase(setting.key)} hint={`Key: ${setting.key}`}>
                  <Input
                    type={isNumeric ? "number" : "text"}
                    value={value === null || value === undefined ? "" : String(value)}
                    onChange={(e) => change(setting.key, isNumeric ? Number(e.target.value) : e.target.value)}
                  />
                </Field>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard title="Configured settings" value={data?.settings.length ?? "—"} />
          <StatCard title="Timezone" value={String(values.time_zone ?? "—")} tone="sky" />
          <StatCard title="Attendance threshold" value={`${values.attendance_threshold ?? "—"}%`} tone="emerald" />
        </div>
      </div>
    </DashboardLayout>
  );
}
