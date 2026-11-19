"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, downloadFile } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  DetailRow,
  ErrorState,
  LoadingSkeleton,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Tabs,
  Field,
  Input,
} from "@/components/ui/Primitives";
import { DataTable } from "@/components/ui/DataTable";

interface DocumentItem {
  id: number;
  document_type: string;
  original_filename: string;
  created_at: string;
  uploader?: { name: string };
}

interface ModuleItem {
  id: number;
  code: string;
  title: string;
  is_required: boolean;
  is_completed?: boolean;
}

interface PhaseItem {
  id: number;
  phase_number: number;
  name: string;
  description?: string;
  modules: ModuleItem[];
}

interface Attempt {
  id: number;
  score?: number | string;
  status: string;
  attempt_number: number;
  assessment?: { title: string; passing_score?: string; assessment_type?: string };
}

interface Evaluation {
  id: number;
  status: string;
  rating?: number;
  feedback?: string;
  evaluated_at?: string;
  competency?: { name: string; category?: string };
}

interface Attendance {
  id: number;
  attendance_status: string;
  remarks?: string;
  trainingSession?: { title: string; starts_at: string };
}

interface TraineeDetail {
  trainee: {
    id: number;
    trainee_number: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    contact_number?: string;
    address?: string;
    employment_status: string;
    trainee_status: string;
    date_of_birth?: string;
    user?: { email: string; last_login_at?: string };
    documents: DocumentItem[];
  };
  enrollment: {
    id: number;
    enrollment_number: string;
    status: string;
    curriculum_version?: { program?: { name: string; code: string }; phases: PhaseItem[] };
    current_phase?: { name: string };
    trainer?: { name: string };
    supervisor?: { name: string };
    started_at?: string;
    assessment_attempts: Attempt[];
    competency_evaluations: Evaluation[];
    attendances: Attendance[];
    module_completions: Array<{ training_module_id: number; completed_at: string }>;
  } | null;
  progress: {
    progress: number;
    modules_completed: number;
    modules_total: number;
    attendance_rate: number;
    assessments_passed: number;
    assessments_total: number;
    competencies_validated: number;
    competencies_total: number;
    outstanding: string[];
  } | null;
  history: Array<{ id: number; enrollment_number: string; status: string; curriculum_version?: { program?: { name: string } } }>;
}

export default function TraineeProfilePage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState("employment_document");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const detail = useApi<TraineeDetail>(`/api/v1/trainees/${params.id}`);

  const trainee = detail.data?.trainee;
  const enrollment = detail.data?.enrollment;
  const progress = detail.data?.progress;
  const phases = enrollment?.curriculum_version?.phases ?? [];
  const completedIds = new Set((enrollment?.module_completions ?? []).map((item) => item.training_module_id));

  async function toggleModule(moduleId: number) {
    if (!enrollment) return;

    try {
      await api.post(`/api/v1/trainees/${params.id}/enrollments/${enrollment.id}/modules/${moduleId}/toggle`);
      toast.notify("Module completion updated.");
      await detail.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to update module.", "error");
    }
  }

  async function uploadDocument() {
    if (!docFile) {
      toast.notify("Select a file to upload.", "error");
      return;
    }

    const form = new FormData();
    form.append("document_type", docType);
    form.append("file", docFile);
    setUploading(true);

    try {
      await api.post(`/api/v1/trainees/${params.id}/documents`, form);
      toast.notify("Document uploaded.");
      setDocOpen(false);
      setDocFile(null);
      await detail.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to upload document.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId: number) {
    try {
      await api.delete(`/api/v1/trainees/${params.id}/documents/${documentId}`);
      toast.notify("Document removed.");
      await detail.refetch();
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Unable to remove document.", "error");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title={trainee ? `${trainee.first_name} ${trainee.last_name}` : "Trainee Profile"}
          description={trainee ? `${trainee.trainee_number} · ${titleCase(trainee.employment_status)}` : undefined}
          breadcrumb="Trainees"
          actions={
            <>
              <Link href="/trainees"><Button variant="secondary">Back to list</Button></Link>
              {can("trainees.update") && <Button onClick={() => setDocOpen(true)}>Upload document</Button>}
            </>
          }
        />

        {detail.loading && <LoadingSkeleton rows={8} />}
        {detail.error && <ErrorState message={detail.error} onRetry={detail.refetch} />}

        {trainee && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card><p className="text-xs text-slate-500">Onboarding status</p><div className="mt-2"><Badge status={enrollment?.status}>{titleCase(enrollment?.status)}</Badge></div></Card>
              <Card><p className="text-xs text-slate-500">Overall progress</p><div className="mt-3"><ProgressBar value={progress?.progress ?? 0} /></div></Card>
              <Card><p className="text-xs text-slate-500">Assigned trainer</p><p className="mt-2 text-sm font-medium">{enrollment?.trainer?.name ?? "Unassigned"}</p></Card>
              <Card><p className="text-xs text-slate-500">Outstanding requirements</p><p className="mt-2 text-sm font-medium">{progress?.outstanding.length ?? 0}</p></Card>
            </div>

            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "progress", label: "Onboarding Progress" },
                { value: "modules", label: "Training Modules" },
                { value: "attendance", label: "Schedule & Attendance" },
                { value: "assessments", label: "Assessments", count: enrollment?.assessment_attempts?.length ?? 0 },
                { value: "competencies", label: "Competencies", count: enrollment?.competency_evaluations?.length ?? 0 },
                { value: "documents", label: "Documents", count: trainee.documents.length },
                { value: "history", label: "Training History" },
              ]}
            />

            {tab === "overview" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Personal & Employment Information">
                  <dl className="divide-y">
                    <DetailRow label="Employee number" value={trainee.trainee_number} />
                    <DetailRow label="Email" value={trainee.user?.email ?? "—"} />
                    <DetailRow label="Contact" value={trainee.contact_number ?? "—"} />
                    <DetailRow label="Address" value={trainee.address ?? "—"} />
                    <DetailRow label="Date of birth" value={formatDate(trainee.date_of_birth)} />
                    <DetailRow label="Employment status" value={titleCase(trainee.employment_status)} />
                    <DetailRow label="Trainee status" value={titleCase(trainee.trainee_status)} />
                  </dl>
                </Card>
                <Card title="Onboarding Assignment">
                  <dl className="divide-y">
                    <DetailRow label="Program" value={enrollment?.curriculum_version?.program?.name ?? "Not assigned"} />
                    <DetailRow label="Enrollment no." value={enrollment?.enrollment_number ?? "—"} />
                    <DetailRow label="Current phase" value={enrollment?.current_phase?.name ?? "—"} />
                    <DetailRow label="Trainer" value={enrollment?.trainer?.name ?? "Unassigned"} />
                    <DetailRow label="Supervisor" value={enrollment?.supervisor?.name ?? "Unassigned"} />
                    <DetailRow label="Training start" value={formatDate(enrollment?.started_at)} />
                  </dl>
                  <div className="mt-4 rounded-lg border bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">Outstanding requirements</p>
                    {progress?.outstanding.length ? (
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {progress.outstanding.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-600">All mandatory requirements satisfied.</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {tab === "progress" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Completion Summary">
                  <dl className="divide-y">
                    <DetailRow label="Modules" value={`${progress?.modules_completed ?? 0} / ${progress?.modules_total ?? 0}`} />
                    <DetailRow label="Attendance" value={`${progress?.attendance_rate ?? 0}%`} />
                    <DetailRow label="Assessments passed" value={`${progress?.assessments_passed ?? 0} / ${progress?.assessments_total ?? 0}`} />
                    <DetailRow label="Competencies validated" value={`${progress?.competencies_validated ?? 0} / ${progress?.competencies_total ?? 0}`} />
                    <DetailRow label="Overall progress" value={<ProgressBar value={progress?.progress ?? 0} />} />
                  </dl>
                </Card>
                <Card title="Phase Completion">
                  <div className="space-y-3">
                    {phases.map((phase) => {
                      const completed = phase.modules.filter((module) => completedIds.has(module.id)).length;
                      const pct = phase.modules.length ? (completed / phase.modules.length) * 100 : 0;
                      return (
                        <div key={phase.id}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-700">Phase {phase.phase_number}: {phase.name}</span>
                            <span className="text-xs text-slate-500">{completed}/{phase.modules.length}</span>
                          </div>
                          <ProgressBar value={pct} />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {tab === "modules" && (
              <Card title="Curriculum Modules" description="Toggle completion as training is validated.">
                <div className="space-y-4">
                  {phases.map((phase) => (
                    <div key={phase.id}>
                      <p className="mb-2 text-sm font-semibold text-slate-800">Phase {phase.phase_number}: {phase.name}</p>
                      <div className="space-y-2">
                        {phase.modules.map((module) => {
                          const complete = completedIds.has(module.id);
                          return (
                            <div key={module.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{module.title}</p>
                                <p className="text-xs text-slate-400">{module.code} · {module.is_required ? "Required" : "Optional"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge status={complete ? "completed" : "pending"}>{complete ? "Completed" : "Pending"}</Badge>
                                {can("trainees.update") && enrollment && (
                                  <Button size="sm" variant="secondary" onClick={() => toggleModule(module.id)}>
                                    {complete ? "Mark incomplete" : "Mark complete"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "attendance" && (
              <Card title="Attendance History">
                <DataTable
                  rows={enrollment?.attendances ?? []}
                  columns={[
                    { key: "session", label: "Session", render: (row) => row.trainingSession?.title ?? "—" },
                    { key: "date", label: "Date", render: (row) => formatDateTime(row.trainingSession?.starts_at) },
                    { key: "status", label: "Attendance", render: (row) => <Badge status={row.attendance_status}>{titleCase(row.attendance_status)}</Badge> },
                    { key: "remarks", label: "Remarks", render: (row) => row.remarks ?? "—" },
                  ]}
                  emptyTitle="No attendance records"
                />
              </Card>
            )}

            {tab === "assessments" && (
              <Card title="Assessment Attempts">
                <DataTable
                  rows={enrollment?.assessment_attempts ?? []}
                  columns={[
                    { key: "assessment", label: "Assessment", render: (row) => row.assessment?.title ?? "—" },
                    { key: "type", label: "Type", render: (row) => titleCase(row.assessment?.assessment_type) },
                    { key: "attempt", label: "Attempt", render: (row) => row.attempt_number },
                    { key: "score", label: "Score", render: (row) => row.score ?? "Pending" },
                    { key: "passing", label: "Passing", render: (row) => row.assessment?.passing_score ?? "—" },
                    { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                  ]}
                  emptyTitle="No assessment attempts"
                />
              </Card>
            )}

            {tab === "competencies" && (
              <Card title="Competency Evaluations">
                <DataTable
                  rows={enrollment?.competency_evaluations ?? []}
                  columns={[
                    { key: "competency", label: "Competency", render: (row) => row.competency?.name ?? "—" },
                    { key: "category", label: "Category", render: (row) => row.competency?.category ?? "—" },
                    { key: "rating", label: "Rating", render: (row) => row.rating ?? "—" },
                    { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                    { key: "evaluated", label: "Evaluated", render: (row) => formatDate(row.evaluated_at) },
                  ]}
                  emptyTitle="No competency evaluations"
                />
              </Card>
            )}

            {tab === "documents" && (
              <Card title="Trainee Documents" description="Employment and supporting documents">
                <div className="space-y-2">
                  {trainee.documents.length === 0 && <p className="py-4 text-sm text-slate-500">No documents uploaded.</p>}
                  {trainee.documents.map((document) => (
                    <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{document.original_filename}</p>
                        <p className="text-xs text-slate-400">{titleCase(document.document_type)} · {formatDate(document.created_at)} · {document.uploader?.name ?? "System"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadFile(`/api/v1/trainees/${params.id}/documents/${document.id}/download`, document.original_filename)}
                        >
                          Download
                        </Button>
                        {can("trainees.update") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteDocument(document.id)}>Remove</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "history" && (
              <Card title="Enrollment and Training History">
                <DataTable
                  rows={detail.data?.history ?? []}
                  columns={[
                    { key: "enrollment_number", label: "Enrollment" },
                    { key: "program", label: "Program", render: (row) => row.curriculum_version?.program?.name ?? "—" },
                    { key: "status", label: "Status", render: (row) => <Badge status={row.status}>{titleCase(row.status)}</Badge> },
                  ]}
                  emptyTitle="No training history"
                />
              </Card>
            )}
          </>
        )}
      </div>

      <Modal open={docOpen} title="Upload trainee document" onClose={() => setDocOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setDocOpen(false)}>Cancel</Button><Button onClick={uploadDocument} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button></>}
      >
        <div className="space-y-4">
          <Field label="Document Type" required>
            <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {["employment_document", "appointment", "identification", "certificate", "medical", "other"].map((value) => (
                <option key={value} value={value}>{titleCase(value)}</option>
              ))}
            </Select>
          </Field>
          <Field label="File" required hint="PDF, DOCX, XLSX, PNG or JPG up to 10MB.">
            <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
