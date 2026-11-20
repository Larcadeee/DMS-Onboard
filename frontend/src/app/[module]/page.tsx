import { notFound } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, PageHeader } from "@/components/ui/Primitives";

const modules: Record<string, { title: string; description: string }> = {
  trainees: {
    title: "Trainee Management",
    description: "Register, manage, and monitor Emergency Telecommunicator trainees.",
  },
  programs: {
    title: "Programs and Curriculum",
    description: "Manage onboarding programs, curriculum versions, phases, and modules.",
  },
  training: {
    title: "Training Activities",
    description: "Manage training activities, sessions, and learning assignments.",
  },
  attendance: {
    title: "Attendance Management",
    description: "Monitor and record trainee attendance.",
  },
  assessments: {
    title: "Assessment and Evaluation",
    description: "Manage examinations, practical assessments, and evaluation results.",
  },
  competencies: {
    title: "Competency Tracking",
    description: "Monitor demonstrated competencies and evaluator findings.",
  },
  reports: {
    title: "Reports and Analytics",
    description: "Generate trainee progress, attendance, and performance reports.",
  },
  users: {
    title: "User Management",
    description: "Manage user accounts, roles, and system access.",
  },
};

export function generateStaticParams() {
  return Object.keys(modules).map((module) => ({ module }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const page = modules[module];

  if (!page) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader title={page.title} description={page.description} breadcrumb="Module" />

        <Card title="Module initialization">
          <p className="max-w-2xl text-sm leading-6 text-muted">
            This module interface is being prepared. Its operational functions will be integrated in the next development stage.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
