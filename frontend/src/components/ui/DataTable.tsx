"use client";

import type { ReactNode } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "./Primitives";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription,
  emptyAction,
  keyField = "id",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  keyField?: string;
}) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left">
            {columns.map((column) => (
              <th key={column.key} className={`whitespace-nowrap pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400 ${column.className ?? ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={String((row as Record<string, unknown>)[keyField] ?? index)} className="hover:bg-slate-50/60">
              {columns.map((column) => (
                <td key={column.key} className={`whitespace-nowrap py-3 pr-4 align-middle text-slate-700 ${column.className ?? ""}`}>
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
