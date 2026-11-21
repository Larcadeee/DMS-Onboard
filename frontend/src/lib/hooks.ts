"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  setData: (value: T | null) => void;
}

const responseCache = new Map<string, unknown>();

export function clearApiCache(): void {
  responseCache.clear();
}

export function useApi<T>(endpoint: string | null, timeoutMs?: number): ApiState<T> {
  const [data, setData] = useState<T | null>(() => (endpoint ? ((responseCache.get(endpoint) as T | undefined) ?? null) : null));
  const [loading, setLoading] = useState(() => Boolean(endpoint) && !responseCache.has(endpoint as string));
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const automaticEndpoint = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pendingController = controller.current;
      queueMicrotask(() => {
        if (!mounted.current) {
          requestId.current += 1;
          pendingController?.abort();
        }
      });
    };
  }, []);

  const load = useCallback(async () => {
    if (!endpoint) {
      setData(null);
      setLoading(false);
      setError("");
      return;
    }

    const cached = responseCache.get(endpoint) as T | undefined;
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    let timedOut = false;
    const timeout = timeoutMs
      ? window.setTimeout(() => {
          timedOut = true;
          requestController.abort();
        }, timeoutMs)
      : undefined;

    if (cached !== undefined) {
      setData(cached);
    } else {
      setData(null);
    }

    setLoading(cached === undefined);
    setError("");

    try {
      const result = await apiRequest(endpoint, { signal: requestController.signal }) as T;
      responseCache.set(endpoint, result);

      if (mounted.current && currentRequest === requestId.current) {
        setData(result);
      }
    } catch (err) {
      if (mounted.current && currentRequest === requestId.current) {
        setError(
          timedOut
            ? "The request timed out. Check your connection and try again."
            : err instanceof Error
              ? err.message
              : "Unable to load data."
        );
      }
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (mounted.current && currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [endpoint, timeoutMs]);

  useEffect(() => {
    if (automaticEndpoint.current === endpoint) return;
    automaticEndpoint.current = endpoint;
    void load();
  }, [endpoint, load]);

  return { data, loading, error, refetch: () => load(), setData };
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
