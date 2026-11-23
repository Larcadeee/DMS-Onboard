
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string): string {
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
}

export interface Paginated<T> {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: T[];
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function getXsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("XSRF-TOKEN="));

  if (!cookie) return undefined;

  return decodeURIComponent(cookie.substring("XSRF-TOKEN=".length));
}

export async function initializeCsrf(signal?: AbortSignal): Promise<void> {
  const response = await fetch(apiUrl("/sanctum/csrf-cookie"), {
    method: "GET",
    credentials: "include",
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to initialize secure session.");
  }
}

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

function requestOptions(options: RequestInit): RequestInit {
  const token = getXsrfToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  return {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "X-XSRF-TOKEN": token } : {}),
      ...options.headers,
    },
  };
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  let response = await fetch(apiUrl(endpoint), requestOptions(options));

  // A 419 means the CSRF token expired. Refresh it once and retry the request
  // so expired sessions/logins fail cleanly instead of blocking the user.
  if (response.status === 419) {
    await initializeCsrf(options.signal ?? undefined).catch(() => undefined);
    response = await fetch(apiUrl(endpoint), requestOptions(options));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && endpoint !== "/api/v1/login" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      data.message || `Request failed (${response.status}).`,
      response.status,
      data.errors
    );
  }

  return data;
}

export function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const value = search.toString();

  return value ? `?${value}` : "";
}

export const api = {
  get: <T>(endpoint: string) => apiRequest(endpoint) as Promise<T>,
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest(endpoint, {
      method: "POST",
      ...(body !== undefined ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    }) as Promise<T>,
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest(endpoint, {
      method: "PUT",
      ...(body !== undefined ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    }) as Promise<T>,
  delete: <T>(endpoint: string) =>
    apiRequest(endpoint, { method: "DELETE" }) as Promise<T>,
};

export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const response = await fetch(apiUrl(endpoint), { credentials: "include" });

  if (!response.ok) {
    throw new ApiError("Unable to download file.", response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
