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

export function useApi<T>(endpoint: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.get<T>(endpoint);
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Unable to load data.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load, setData };
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
