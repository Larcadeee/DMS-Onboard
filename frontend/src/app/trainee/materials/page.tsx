"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { downloadFile } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, PageHeader } from "@/components/ui/Primitives";

interface Material {
  id: number;
  title: string;
  description?: string;
  document_type?: string;
  original_filename?: string;
  file_size?: number;
  version?: string;
  status: string;
  created_at: string;
  module?: { title: string };
  phase?: { name: string };
  program?: { name: string };
}

export default function TraineeMaterialsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);
  const { data, loading, error, refetch } = useApi<{ materials: Material[] }>("/api/v1/my/materials");

  const materials = (data?.materials ?? []).filter((material) => {
    if (!search) return true;
    const haystack = `${material.title} ${material.description ?? ""} ${material.module?.title ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  async function download(material: Material) {
    setDownloading(material.id);

    try {
      await downloadFile(`/api/v1/materials/${material.id}/download`, material.original_filename ?? `${material.title}.pdf`);
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to download material.", "error");
    } finally {
      setDownloading(null);
    }
  }

  function sizeLabel(bytes?: number): string {
    if (!bytes) return "—";
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Learning Materials"
          description="Reference documents, manuals and presentations assigned to your onboarding program."
          breadcrumb="My Onboarding"
        />

        <Card>
          <div className="mb-4">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials..." className="max-w-sm" />
          </div>

          {loading && <LoadingSkeleton rows={4} />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && materials.length === 0 && (
            <EmptyState title="No materials available" description="Your trainer has not published learning materials for your program yet." />
          )}

          <ul className="divide-y divide-line">
            {materials.map((material) => (
              <li key={material.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{material.title}</p>
                    {material.document_type && <Badge status="scheduled">{titleCase(material.document_type)}</Badge>}
                    {material.version && <span className="text-xs text-slate-400">v{material.version}</span>}
                  </div>
                  {material.description && <p className="mt-1 text-sm text-slate-600">{material.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {[material.module?.title, material.phase?.name, material.program?.name].filter(Boolean).join(" · ")}
                    {" · "}{sizeLabel(material.file_size)} · Added {formatDate(material.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => download(material)} loading={downloading === material.id}>
                  {downloading === material.id ? "Downloading" : "Download"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
