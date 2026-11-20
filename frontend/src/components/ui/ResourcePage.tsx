"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, query, type Paginated } from "@/lib/api/client";
import { useApi, useDebounced } from "@/lib/hooks";
import { Button, Card, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Skeleton, StatCard, Textarea } from "./Primitives";
import { DataTable, type Column } from "./DataTable";
import { useToast } from "./Toast";

export type ResourceRow = Record<string, unknown>;

export interface ResourceField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "datetime-local" | "textarea" | "select" | "checkbox" | "file" | "password";
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  accept?: string;
  colSpan?: 1 | 2;
}

export interface ResourceFilter {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function ResourcePage({
  title,
  description,
  breadcrumb,
  endpoint,
  columns,
  fields,
  searchPlaceholder = "Search records...",
  filters = [],
  canManage = false,
  createLabel = "Create",
  summaryEndpoint,
  summaryCards = [],
  defaults = {},
  rowActions,
  extraParams = {},
  transformForm,
  formTitle,
  emptyDescription,
  deleteConfirmation = "This action cannot be undone. Continue?",
  onSaved,
  headerActions,
}: {
  title: string;
  description?: string;
  breadcrumb?: string;
  endpoint: string;
  columns: Column<ResourceRow>[];
  fields: ResourceField[];
  searchPlaceholder?: string;
  filters?: ResourceFilter[];
  canManage?: boolean;
  createLabel?: string;
  summaryEndpoint?: string;
  summaryCards?: Array<{ key: string; title: string; description?: string }>;
  defaults?: Record<string, unknown>;
  rowActions?: (row: ResourceRow, helpers: { edit: (row: ResourceRow) => void; remove: (row: ResourceRow) => void; refresh: () => void }) => ReactNode;
  extraParams?: Record<string, string>;
  transformForm?: (values: Record<string, unknown>) => Record<string, unknown> | FormData;
  formTitle?: { create: string; edit: string };
  emptyDescription?: string;
  deleteConfirmation?: string;
  onSaved?: () => void;
  headerActions?: ReactNode;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(defaults);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState<ResourceRow | null>(null);

  const params = useMemo(
    () => ({ page, search: debounced, ...filterValues, ...extraParams }),
    [page, debounced, filterValues, extraParams]
  );

  const list = useApi<Paginated<ResourceRow>>(`${endpoint}${query(params)}`);
  const summary = useApi<Record<string, unknown>>(summaryEndpoint ?? null);

  useEffect(() => {
    setPage(1);
  }, [debounced, filterValues]);

  const rows = list.data?.data ?? [];

  function openCreate() {
    setEditing(null);
    setValues({ ...defaults });
    setFormError("");
    setOpen(true);
  }

  function openEdit(row: ResourceRow) {
    const initial: Record<string, unknown> = { ...defaults };
    fields.forEach((field) => {
      const value = row[field.name];
      if (field.type === "checkbox") {
        initial[field.name] = Boolean(value);
      } else if (field.type === "datetime-local" && typeof value === "string") {
        initial[field.name] = value.slice(0, 16);
      } else {
        initial[field.name] = value ?? "";
      }
    });
    initial.id = row.id;
    setEditing(row);
    setValues(initial);
    setFormError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const payload = transformForm ? transformForm(values) : values;
      const identifier = editing?.id;

      if (payload instanceof FormData) {
        if (identifier) {
          await api.post(`${endpoint}/${identifier}`, payload);
        } else {
          await api.post(endpoint, payload);
        }
      } else if (identifier) {
        await api.put(`${endpoint}/${identifier}`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      toast.notify(editing ? "Record updated successfully." : "Record created successfully.");
      setOpen(false);
      await list.refetch();
      await summary.refetch();
      onSaved?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: ResourceRow) {
    try {
      await api.delete(`${endpoint}/${row.id}`);
      toast.notify("Record archived.");
      setConfirming(null);
      await list.refetch();
      await summary.refetch();
      onSaved?.();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to archive record.", "error");
    }
  }

  const actions = (row: ResourceRow) =>
    rowActions ? rowActions(row, { edit: openEdit, remove: setConfirming, refresh: () => list.refetch() }) : null;

  const allColumns: Column<ResourceRow>[] = actions
    ? [...columns, { key: "__actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-1.5">{actions(row)}</div> }]
    : columns;

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} breadcrumb={breadcrumb} actions={
        <div className="flex flex-wrap gap-2">
          {headerActions}
          {canManage && <Button onClick={openCreate}>{createLabel}</Button>}
        </div>
      } />

      {summaryCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) =>
            summary.loading ? (
              <div key={card.key} className="rounded-lg border border-line bg-surface px-4 py-4">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="mt-3 h-7 w-14" />
                <Skeleton className="mt-2 h-2.5 w-32" />
              </div>
            ) : (
              <StatCard
                key={card.key}
                title={card.title}
                value={(summary.data?.[card.key] as string | number | undefined) ?? "—"}
                description={card.description}
              />
            )
          )}
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} />
          {filters.map((filter) => (
            <label key={filter.key} className="text-xs text-slate-500">
              <span className="mb-1 block">{filter.label}</span>
              <Select
                value={filterValues[filter.key] ?? ""}
                onChange={(event) => setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                className="w-44"
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
          ))}
        </div>

        <DataTable
          columns={allColumns}
          rows={rows}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyDescription={emptyDescription}
          emptyAction={canManage ? <Button size="sm" onClick={openCreate}>{createLabel}</Button> : undefined}
        />

        <div className="mt-4 border-t border-line pt-3">
          <Pagination
            page={list.data?.current_page ?? 1}
            lastPage={list.data?.last_page ?? 1}
            total={list.data?.total ?? 0}
            onPage={setPage}
          />
        </div>
      </Card>

      <Modal
        open={open}
        title={editing ? formTitle?.edit ?? `Edit ${title}` : formTitle?.create ?? createLabel}
        onClose={() => setOpen(false)}
        wide={fields.length > 8}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="resource-form" loading={saving}>{saving ? "Saving changes" : "Save changes"}</Button>
          </>
        }
      >
        <form id="resource-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {formError && <p role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">{formError}</p>}
          {fields.map((field) => {
            const value = values[field.name];
            const common = {
              name: field.name,
              required: field.required,
              placeholder: field.placeholder,
            };

            return (
              <Field
                key={field.name}
                label={field.label}
                required={field.required}
                hint={field.hint}
                className={field.colSpan === 2 ? "sm:col-span-2" : undefined}
              >
                {field.type === "textarea" ? (
                  <Textarea rows={3} value={String(value ?? "")} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} {...common} />
                ) : field.type === "select" ? (
                  <Select value={String(value ?? "")} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} {...common}>
                    <option value="">Select...</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                ) : field.type === "file" ? (
                  <input
                    type="file"
                    accept={field.accept}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.files?.[0] ?? "" })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <Input
                    type={field.type ?? "text"}
                    value={String(value ?? "")}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    {...common}
                  />
                )}
              </Field>
            );
          })}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirming)}
        title="Confirm archive"
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirming && remove(confirming)}>Archive record</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{deleteConfirmation}</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{String(confirming?.title ?? confirming?.name ?? confirming?.code ?? "")}</p>
      </Modal>
    </div>
  );
}
