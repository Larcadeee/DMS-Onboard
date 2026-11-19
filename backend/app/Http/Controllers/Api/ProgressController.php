<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Services\AuditLogger;
use App\Services\ProgressCalculator;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function index(Request $request, ProgressCalculator $calculator)
    {
        $query = Enrollment::with([
            'trainee', 'curriculumVersion.program', 'curriculumVersion.phases.modules',
            'curriculumVersion.phases.modules.competencies', 'curriculumVersion.phases.modules.assessments',
            'currentPhase', 'trainer', 'supervisor', 'moduleCompletions', 'attendances',
            'assessmentAttempts.assessment', 'competencyEvaluations',
        ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'curriculumVersion', fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('trainer_id'), fn ($q) => $q->where('assigned_trainer_id', $request->trainer_id))
            ->when($request->filled('search'), fn ($q) => $q->whereHas(
                'trainee',
                fn ($t) => $t->whereRaw("(first_name || ' ' || last_name) ilike ?", ['%' . $request->search . '%'])
                    ->orWhere('trainee_number', 'ilike', '%' . $request->search . '%')
            ));

        $user = $request->user();
        if ($user->role?->slug === 'etc_trainee') {
            $query->where('trainee_id', $user->trainee?->id ?? 0);
        }

        $paginator = $query->orderByDesc('created_at')->paginate(20);
        $paginator->getCollection()->transform(fn ($enrollment) => $calculator->forEnrollment($enrollment));

        return $paginator;
    }

    public function summary(ProgressCalculator $calculator)
    {
        $status = Enrollment::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('enrolled','ongoing') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
            SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review
        ")->first();

        return response()->json($status);
    }

    public function show(Enrollment $enrollment, ProgressCalculator $calculator)
    {
        $progress = $calculator->forEnrollment($enrollment);
        $enrollment->load(['trainee', 'trainer:id,name', 'supervisor:id,name', 'curriculumVersion.program']);

        return response()->json([
            'progress' => $progress,
            'enrollment' => $enrollment,
            'ready_for_approval' => $calculator->requiresApproval($progress),
        ]);
    }

    public function submit(Request $request, Enrollment $enrollment, AuditLogger $audit)
    {
        $enrollment->update(['status' => 'pending_review', 'submitted_for_review_at' => now()]);
        $audit->record($request, 'onboarding.submitted', 'Enrollment', $enrollment->id, 'Onboarding submitted for final review.');

        return response()->json(['message' => 'Submitted for final review.']);
    }

    public function approve(Request $request, Enrollment $enrollment, AuditLogger $audit, ProgressCalculator $calculator)
    {
        $progress = $calculator->forEnrollment($enrollment);

        if (! $calculator->requiresApproval($progress) && ! $request->boolean('override')) {
            return response()->json([
                'message' => 'Outstanding requirements must be resolved before final approval.',
                'outstanding' => $progress['outstanding'],
            ], 422);
        }

        $data = $request->validate(['remarks' => ['nullable', 'string']]);

        $enrollment->update([
            'status' => 'completed',
            'completed_at' => now(),
            'final_approved_by' => $request->user()->id,
            'final_approved_at' => now(),
            'remarks' => $data['remarks'] ?? $enrollment->remarks,
        ]);

        $enrollment->trainee?->update(['trainee_status' => 'completed']);

        $audit->record($request, 'onboarding.approved', 'Enrollment', $enrollment->id, 'Onboarding completion approved.');

        return response()->json(['message' => 'Onboarding completion approved.']);
    }

    public function returnForTraining(Request $request, Enrollment $enrollment, AuditLogger $audit)
    {
        $data = $request->validate(['remarks' => ['required', 'string']]);

        $enrollment->update([
            'status' => 'ongoing',
            'submitted_for_review_at' => null,
            'remarks' => $data['remarks'],
        ]);

        $audit->record($request, 'onboarding.returned', 'Enrollment', $enrollment->id, 'Returned for additional training.', ['remarks' => $data['remarks']]);

        return response()->json(['message' => 'Returned for additional training.']);
    }
}
