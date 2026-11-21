"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, PageHeader, Pagination } from "@/components/ui/Primitives";

interface Notification {
  id: number;
  title: string;
  message: string | null;
  type: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApi<{ notifications: Paginated<Notification>; unread_count: number }>(
    `/api/v1/notifications?page=${page}`,
    15_000
  );
  const [acting, setActing] = useState(false);

  async function markRead(notification: Notification) {
    if (notification.read_at) return;

    try {
      await api.post(`/api/v1/notifications/${notification.id}/read`);
      await refetch();
      await refresh();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update notification.", "error");
    }
  }

  async function markAll() {
    setActing(true);

    try {
      await api.post("/api/v1/notifications/read-all");
      toast.notify("All notifications marked as read.");
      await refetch();
      await refresh();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update notifications.", "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Notifications"
          description="System alerts about onboarding activities, assessments and approvals."
          breadcrumb="Workspace"
          actions={<Button variant="secondary" onClick={markAll} loading={acting} disabled={!data?.unread_count}>Mark all as read{data?.unread_count ? ` (${data.unread_count})` : ""}</Button>}
        />

        <Card>
          {loading && <LoadingSkeleton rows={5} />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {data && data.notifications.data.length === 0 && (
            <EmptyState title="No notifications" description="You will be notified here when there is onboarding activity for you." />
          )}

          <ul className="divide-y divide-line">
            {data?.notifications.data.map((notification) => (
              <li key={notification.id} className={`flex flex-wrap items-start justify-between gap-3 py-4 ${notification.read_at ? "" : "bg-brand-soft/50"}`}>
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{notification.title}</p>
                    <Badge status={notification.type === "alert" ? "pending" : notification.type === "success" ? "active" : "scheduled"}>{notification.type}</Badge>
                    {!notification.read_at && <span className="h-2 w-2 rounded-full bg-canvas0" aria-label="Unread" />}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(notification.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {notification.link && (
                    <Link href={notification.link} className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-slate-400 hover:bg-canvas">
                      Open
                    </Link>
                  )}
                  {!notification.read_at && <Button size="sm" variant="ghost" onClick={() => markRead(notification)}>Mark read</Button>}
                </div>
              </li>
            ))}
          </ul>

          {data && (
            <div className="mt-4 border-t border-line pt-3">
              <Pagination
                page={data.notifications.current_page}
                lastPage={data.notifications.last_page}
                total={data.notifications.total}
                onPage={setPage}
              />
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
