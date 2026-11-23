"use client";

import { useEffect } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function ActionIcon({
  name,
  className = "h-4 w-4",
}: {
  name: "view" | "add" | "edit" | "delete" | "approve" | "manage" | "download" | "upload" | "refresh" | "settings" | "close" | "search" | "shield";
  className?: string;
}) {
  const paths: Record<typeof name, ReactNode> = {
    view: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    add: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    edit: <><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    delete: <><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></>,
    approve: <><circle cx="12" cy="12" r="9" /><path d="m7.5 12 3 3 6-6" /></>,
    manage: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></>,
    upload: <><path d="M12 15V3M7 8l5-5 5 5M4 20h16" /></>,
    refresh: <><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" /></>,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.5 8.4-8 10-4.5-1.6-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-4.7" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("h-4 w-4 animate-spin", className)} fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const variants = {
  primary: "border border-brand bg-brand text-white hover:border-brand-dark hover:bg-brand-dark",
  secondary: "border border-line-strong bg-surface text-ink-soft hover:border-slate-400 hover:bg-canvas",
  danger: "border border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700",
  ghost: "border border-transparent text-muted hover:bg-canvas hover:text-ink",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "ui-button inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-11 px-3 text-xs" : "h-11 px-4 text-sm",
        variants[variant],
        className
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("content-enter rounded-lg border border-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const statTones = {
  default: "",
  slate: "",
  sky: "",
  violet: "",
  accent: "bg-brand",
  emerald: "bg-brand",
  warning: "bg-amber-500",
  amber: "bg-amber-500",
  danger: "bg-red-500",
  red: "bg-red-500",
};

export function StatCard({
  title,
  value,
  description,
  tone = "default",
  loading = false,
}: {
  title: string;
  value: string | number;
  description?: string;
  tone?: keyof typeof statTones;
  loading?: boolean;
}) {
  return (
    <div className="content-enter rounded-lg border border-line bg-surface px-4 py-4" aria-busy={loading || undefined}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</p>
        {statTones[tone] && <span className={cn("h-1.5 w-1.5 rounded-full", statTones[tone])} aria-hidden="true" />}
      </div>
      {loading ? (
        <div className="mt-3 space-y-2" role="status" aria-label={`Loading ${title}`}>
          <div className="skeleton h-6 w-16 rounded" />
          {description && <div className="skeleton h-2.5 w-28 rounded" />}
        </div>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
          {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
        </>
      )}
    </div>
  );
}

export function statusTone(status?: string | null): string {
  const value = (status ?? "").toLowerCase();
  if (["active", "completed", "validated", "present", "published", "approved", "passed", "competent", "released"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["draft", "pending", "unmarked", "on_hold", "needs_improvement", "excused", "late", "pending_review"].includes(value)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["cancelled", "archived", "inactive", "failed", "absent", "rejected"].includes(value)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-line bg-canvas text-ink-soft";
}

export function Badge({ children, status }: { children: ReactNode; status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        statusTone(status ?? String(children))
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "bg-brand" }: { value: number; tone?: string }) {
  const safe = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safe)}
      >
        <div className={cn("h-full rounded-full transition-all duration-500", tone)} style={{ width: `${safe}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted">{Math.round(safe)}%</span>
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-current={value === tab.value ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            value === tab.value
              ? "border-brand text-ink"
              : "border-transparent text-muted hover:border-line-strong hover:text-ink"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn("ml-1.5 rounded px-1.5 py-0.5 text-[10px] tabular-nums", value === tab.value ? "bg-brand-soft text-brand-dark" : "bg-canvas text-muted")}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn("dialog-panel w-full rounded-lg border border-line bg-surface shadow-2xl", wide ? "max-w-4xl" : "max-w-2xl")}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close dialog"
            title="Close"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
          {label}
          {required && <span className="text-red-700"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-4 text-muted">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const controlClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-faint hover:border-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, "h-11", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, "h-11 pr-8", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, "py-2.5 leading-5", props.className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5L17 17" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(controlClass, "h-11 pl-9 pr-3")}
        aria-label={placeholder}
      />
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (lastPage <= 1) {
    return <p className="text-xs text-muted">{total} record{total === 1 ? "" : "s"}</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">
        Page {page} of {lastPage} <span className="mx-1 text-line-strong">/</span> {total} records
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-canvas text-muted" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 7h14M5 12h14M5 17h8" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-md text-xs leading-5 text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-red-600" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="10" cy="10" r="7" />
            <path d="M10 6.5v4.5M10 13.5v.5" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-red-800">Unable to load this content</p>
          <p className="mt-0.5 text-xs leading-5 text-red-700">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden="true" />;
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading records">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-10 rounded-md" />
      ))}
    </div>
  );
}

export function PageLoading({ label = "Loading page content" }: { label?: string }) {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface p-4">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-2.5 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-44 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</dt>
      <dd className="text-sm leading-6 text-ink-soft">{value ?? "—"}</dd>
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
      {action}
    </div>
  );
}
