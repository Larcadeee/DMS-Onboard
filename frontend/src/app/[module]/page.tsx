import { notFound } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {page.title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {page.description}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-8">
          <h2 className="font-semibold text-slate-800">
            Module initialization
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            This module interface is being prepared. Its database and
            operational functions will be integrated in the next
            development stage.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}