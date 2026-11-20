"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const tones: Record<ToastItem["tone"], { bar: string; dot: string }> = {
  success: { bar: "border-l-brand", dot: "bg-brand" },
  error: { bar: "border-l-red-500", dot: "bg-red-500" },
  info: { bar: "border-l-ink", dot: "bg-ink" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: ToastItem["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item pointer-events-auto flex items-start gap-2.5 rounded-md border border-line border-l-2 bg-surface px-3.5 py-3 text-[13px] leading-5 text-ink shadow-lg ${tones[toast.tone].bar}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tones[toast.tone].dot}`} aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
