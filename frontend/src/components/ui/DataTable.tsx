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
  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="content-enter -mx-5 overflow-x-auto px-5" aria-live="polite">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`whitespace-nowrap border-b border-line pb-2.5 pr-4 text-xs font-medium text-muted ${column.className ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String((row as Record<string, unknown>)[keyField] ?? index)}
              className="group transition-colors hover:bg-canvas"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`whitespace-nowrap border-b border-line/70 py-3 pr-4 align-middle text-[13px] text-ink-soft group-last:border-b-0 ${column.className ?? ""}`}
                >
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
