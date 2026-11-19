<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssessmentAttempt;
use App\Models\AuditLog;
use App\Models\CompetencyEvaluation;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\TrainingSession;
use App\Models\Trainee;
use App\Services\ProgressCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request, ProgressCalculator $calculator)
    {
        $user = $request->user();

        $stats = [
            'trainees_total' => Trainee::count(),
            'trainees_active' => Trainee::where('trainee_status', 'active')->count(),
            'trainees_archived' => Trainee::onlyTrashed()->count(),
            'programs_active' => Program::where('status', 'active')->count(),
            'programs_total' => Program::count(),
            'enrollments_ongoing' => Enrollment::whereIn('status', ['enrolled', 'ongoing'])->count(),
            'enrollments_completed' => Enrollment::where('status', 'completed')->count(),
            'enrollments_on_hold' => Enrollment::where('status', 'on_hold')->count(),
            'pending_review' => Enrollment::where('status', 'pending_review')->count(),
            'pending_assessments' => AssessmentAttempt::where('status', 'submitted')->count(),
            'upcoming_sessions' => TrainingSession::where('starts_at', '>=', now())
                ->where('status', 'scheduled')->count(),
            'pending_competencies' => CompetencyEvaluation::whereIn('status', ['pending', 'needs_improvement'])->count(),
            'unreleased_results' => AssessmentAttempt::where('status', 'evaluated')
                ->whereHas('assessment', fn ($q) => $q->where('release_results', false))->count(),
        ];

        $distribution = Enrollment::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')->get();

        $competency = CompetencyEvaluation::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')->get();

        $upcomingSessions = TrainingSession::with('trainingModule:id,title')
            ->where('starts_at', '>=', now())
            ->where('status', 'scheduled')
            ->orderBy('starts_at')
            ->limit(6)
            ->get();

        $recentActivities = AuditLog::with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $enrollments = Enrollment::with([
            'trainee', 'curriculumVersion.program', 'currentPhase', 'trainer', 'supervisor',
            'moduleCompletions', 'attendances', 'assessmentAttempts.assessment', 'competencyEvaluations',
        ])->orderByDesc('created_at')->limit(10)->get();

        $progress = $enrollments->map(fn ($e) => $calculator->forEnrollment($e));

        if ($user->role?->slug === 'etc_trainee' && $user->trainee) {
            $ownEnrollment = Enrollment::where('trainee_id', $user->trainee->id)->latest()->first();
            if ($ownEnrollment) {
                $progress = collect([$calculator->forEnrollment($ownEnrollment)]);
            }
        }

        return response()->json([
            'stats' => $stats,
            'distribution' => $distribution,
            'competency' => $competency,
            'upcoming_sessions' => $upcomingSessions,
            'recent_activities' => $recentActivities,
            'trainee_progress' => $progress,
        ]);
    }
}
