export interface RoleSummary {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface AuthUser {
  id: number;
  name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  contact_number?: string | null;
  avatar_url?: string | null;
  role: RoleSummary | null;
  permissions: string[];
  trainee_id: number | null;
  must_change_password: boolean;
  is_active: boolean;
  account_status?: "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE";
  last_login_at?: string | null;
  unread_notifications: number;
}

export const isTrainee = (user: AuthUser | null) => user?.role?.slug === "etc_trainee";

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function titleCase(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function percent(value?: number | null): string {
  if (value === undefined || value === null) return "0%";
  return `${Math.round(value)}%`;
}

export function fullName(person?: { first_name?: string; last_name?: string; name?: string } | null): string {
  if (!person) return "—";
  if (person.name) return person.name;
  return `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "—";
}
