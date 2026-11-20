"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/components/ui/Primitives";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
}

export function NotificationPopover({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.get<{ data: Notification[] }>("/api/v1/notifications?per_page=10");
      setNotifications(result.data ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {
      // Ignore error
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
        aria-label={open ? "Close notifications" : "Open notifications"}
        aria-expanded={open}
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={cn(
            "absolute right-0 mt-2 w-80 rounded-lg border border-line bg-surface py-1 shadow-lg z-50",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          role="menu"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/notifications");
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  View all
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading notifications...
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No notifications
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-canvas",
                    !notification.read_at && "bg-brand/[0.03]"
                  )}
                  role="menuitem"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 h-8 w-8 rounded-full items-center justify-center text-white text-xs font-medium",
                      notification.type === "account" && "bg-brand",
                      notification.type === "training" && "bg-blue-500",
                      notification.type === "assessment" && "bg-amber-500",
                      notification.type === "system" && "bg-slate-500",
                      "bg-brand"
                    )}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                        <path d="M10 21h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium text-ink", !notification.read_at && "font-semibold")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted truncate">{notification.message}</p>
                      <p className="mt-1 text-[10px] text-faint">{formatDateTime(notification.created_at)}</p>
                    </div>
                    {!notification.read_at && (
                      <span className="flex-shrink-0 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}