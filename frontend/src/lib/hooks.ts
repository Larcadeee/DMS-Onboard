"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";

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

export function useApi<T>(endpoint: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(() => (endpoint ? ((responseCache.get(endpoint) as T | undefined) ?? null) : null));
  const [loading, setLoading] = useState(() => Boolean(endpoint) && !responseCache.has(endpoint as string));
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
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

    if (cached !== undefined) {
      setData(cached);
    } else {
      setData(null);
    }

    setLoading(cached === undefined);
    setError("");

    try {
      const result = await api.get<T>(endpoint);
      responseCache.set(endpoint, result);

      if (mounted.current && currentRequest === requestId.current) {
        setData(result);
      }
    } catch (err) {
      if (mounted.current && currentRequest === requestId.current) {
        setError(err instanceof Error ? err.message : "Unable to load data.");
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

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
