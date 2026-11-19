<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboard()
    {
        return response()->json([
            'trainees' => [
                'total' => DB::table('trainees')
                    ->whereNull('deleted_at')->count(),
                'active' => DB::table('trainees')
                    ->whereNull('deleted_at')
                    ->where('trainee_status', 'active')->count(),
            ],

            'programs' => [
                'total' => DB::table('programs')
                    ->whereNull('deleted_at')->count(),
                'active' => DB::table('programs')
                    ->where('is_active', true)->count(),
            ],

            'enrollments' => [
                'total' => DB::table('enrollments')->count(),
                'ongoing' => DB::table('enrollments')
                    ->where('status', 'ongoing')->count(),
                'completed' => DB::table('enrollments')
                    ->where('status', 'completed')->count(),
            ],

            'attendance' => DB::table('session_attendances')
                ->selectRaw("
                    COUNT(*) as total_records,
                    SUM(CASE WHEN attendance_status = 'present'
                        THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN attendance_status = 'absent'
                        THEN 1 ELSE 0 END) as absent
                ")
                ->first(),

            'assessments' => [
                'total_attempts' => DB::table('assessment_attempts')->count(),
                'submitted' => DB::table('assessment_attempts')
                    ->where('status', 'submitted')->count(),
            ],

            'competencies' => [
                'competent' => DB::table('competency_evaluations')
                    ->where('status', 'competent')->count(),
                'not_yet_competent' => DB::table('competency_evaluations')
                    ->where('status', 'not_yet_competent')->count(),
            ],
        ]);
    }

    public function traineeProgress(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = DB::table('enrollments')
            ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
            ->join(
                'curriculum_versions',
                'enrollments.curriculum_version_id',
                '=',
                'curriculum_versions.id'
            )
            ->join('programs', 'curriculum_versions.program_id', '=', 'programs.id')
            ->select(
                'enrollments.id',
                'enrollments.enrollment_number',
                'enrollments.status',
                'enrollments.enrolled_at',
                'enrollments.completed_at',
                'trainees.trainee_number',
                'trainees.first_name',
                'trainees.last_name',
                'programs.name as program_name',
                'curriculum_versions.version_number'
            );

        if ($request->filled('date_from')) {
            $query->whereDate('enrollments.enrolled_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('enrollments.enrolled_at', '<=', $request->date_to);
        }

        return response()->json($query->orderByDesc('enrollments.created_at')->paginate(25));
    }

    public function attendance(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = DB::table('session_attendances')
            ->join(
                'training_sessions',
                'session_attendances.training_session_id',
                '=',
                'training_sessions.id'
            )
            ->join('enrollments', 'session_attendances.enrollment_id', '=', 'enrollments.id')
            ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
            ->select(
                'training_sessions.title',
                'training_sessions.starts_at',
                'trainees.trainee_number',
                'trainees.first_name',
                'trainees.last_name',
                'session_attendances.attendance_status',
                'session_attendances.check_in_at',
                'session_attendances.check_out_at'
            );

        if ($request->filled('date_from')) {
            $query->whereDate('training_sessions.starts_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('training_sessions.starts_at', '<=', $request->date_to);
        }

        return response()->json($query->orderByDesc('training_sessions.starts_at')->paginate(25));
    }

    public function overview(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'program_id' => ['nullable', 'exists:programs,id'],
        ]);

        $enrollments = \App\Models\Enrollment::query()
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'curriculumVersion', fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to));

        $attendance = \App\Models\SessionAttendance::query()
            ->when($request->filled('date_from'), fn ($q) => $q->whereHas(
                'trainingSession', fn ($s) => $s->whereDate('starts_at', '>=', $request->date_from)
            ))
            ->when($request->filled('date_to'), fn ($q) => $q->whereHas(
                'trainingSession', fn ($s) => $s->whereDate('starts_at', '<=', $request->date_to)
            ));

        return response()->json([
            'generated_at' => now(),
            'filters' => $request->only(['date_from', 'date_to', 'program_id']),
            'trainees' => [
                'total' => \App\Models\Trainee::count(),
                'active' => \App\Models\Trainee::where('trainee_status', 'active')->count(),
            ],
            'onboarding' => [
                'total' => (clone $enrollments)->count(),
                'ongoing' => (clone $enrollments)->whereIn('status', ['enrolled', 'ongoing'])->count(),
                'completed' => (clone $enrollments)->where('status', 'completed')->count(),
                'on_hold' => (clone $enrollments)->where('status', 'on_hold')->count(),
            ],
            'attendance' => [
                'total' => (clone $attendance)->count(),
                'present' => (clone $attendance)->whereIn('attendance_status', ['present', 'late'])->count(),
                'absent' => (clone $attendance)->where('attendance_status', 'absent')->count(),
                'late' => (clone $attendance)->where('attendance_status', 'late')->count(),
                'excused' => (clone $attendance)->where('attendance_status', 'excused')->count(),
            ],
            'assessments' => [
                'attempts' => \App\Models\AssessmentAttempt::count(),
                'passed' => \App\Models\AssessmentAttempt::whereNotNull('score')
                    ->whereColumn('score', '>=', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'))->count(),
                'failed' => \App\Models\AssessmentAttempt::whereNotNull('score')
                    ->whereColumn('score', '<', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'))->count(),
            ],
            'competencies' => [
                'competent' => \App\Models\CompetencyEvaluation::whereIn('status', ['competent', 'validated'])->count(),
                'validated' => \App\Models\CompetencyEvaluation::where('status', 'validated')->count(),
                'needs_improvement' => \App\Models\CompetencyEvaluation::where('status', 'needs_improvement')->count(),
            ],
        ]);
    }

    public function individual(\App\Models\Trainee $trainee, \App\Services\ProgressCalculator $calculator)
    {
        $trainee->load([
            'user:id,name,email',
            'enrollments.curriculumVersion.program',
            'enrollments.currentPhase',
            'enrollments.moduleCompletions',
            'enrollments.attendances.trainingSession',
            'enrollments.assessmentAttempts.assessment',
            'enrollments.competencyEvaluations.competency',
            'enrollments.competencyEvaluations.evaluator:id,name',
            'documents',
        ]);

        $enrollment = $trainee->enrollments->sortByDesc('created_at')->first();

        return response()->json([
            'generated_at' => now(),
            'trainee' => $trainee,
            'enrollment' => $enrollment,
            'progress' => $enrollment ? $calculator->forEnrollment($enrollment) : null,
        ]);
    }

    public function programPerformance(Request $request, \App\Services\ProgressCalculator $calculator)
    {
        $programs = \App\Models\Program::with('curriculumVersions.enrollments')->get();

        return response()->json([
            'generated_at' => now(),
            'programs' => $programs->map(function ($program) use ($calculator) {
                $enrollments = $program->curriculumVersions->flatMap->enrollments;
                $progress = $enrollments->map(fn ($e) => $calculator->forEnrollment($e));

                return [
                    'id' => $program->id,
                    'code' => $program->code,
                    'name' => $program->name,
                    'status' => $program->status,
                    'trainees' => $enrollments->count(),
                    'completed' => $enrollments->where('status', 'completed')->count(),
                    'completion_rate' => $enrollments->count()
                        ? round($enrollments->where('status', 'completed')->count() / $enrollments->count() * 100)
                        : 0,
                    'average_progress' => $progress->count() ? round($progress->avg('progress')) : 0,
                    'attendance_rate' => $progress->count() ? round($progress->avg('attendance_rate')) : 0,
                    'assessment_pass_rate' => (function () use ($progress) {
                        $total = $progress->sum('assessments_total');
                        $passed = $progress->sum('assessments_passed');

                        return $total ? round($passed / $total * 100) : 0;
                    })(),
                ];
            }),
        ]);
    }

    public function completion(Request $request)
    {
        $rows = \App\Models\Enrollment::with([
            'trainee:id,first_name,last_name,trainee_number',
            'curriculumVersion.program:id,name',
            'supervisor:id,name',
        ])
            ->where('status', 'completed')
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('completed_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('completed_at', '<=', $request->date_to))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'curriculumVersion', fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->orderByDesc('completed_at')
            ->get();

        return response()->json(['generated_at' => now(), 'completions' => $rows]);
    }

    public function export(Request $request)
    {
        $type = $request->query('type', 'progress');
        $filename = "cdrrmd-{$type}-report-" . now()->format('Ymd-His') . '.csv';

        $rows = match ($type) {
            'attendance' => DB::table('session_attendances')
                ->join('training_sessions', 'session_attendances.training_session_id', '=', 'training_sessions.id')
                ->join('enrollments', 'session_attendances.enrollment_id', '=', 'enrollments.id')
                ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
                ->select('training_sessions.starts_at', 'training_sessions.title', 'trainees.trainee_number', 'trainees.first_name', 'trainees.last_name', 'session_attendances.attendance_status')
                ->orderByDesc('training_sessions.starts_at')->get(),
            'completion' => DB::table('enrollments')
                ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
                ->join('curriculum_versions', 'enrollments.curriculum_version_id', '=', 'curriculum_versions.id')
                ->join('programs', 'curriculum_versions.program_id', '=', 'programs.id')
                ->where('enrollments.status', 'completed')
                ->select('trainees.trainee_number', 'trainees.first_name', 'trainees.last_name', 'programs.name', 'enrollments.completed_at')
                ->get(),
            'competency' => DB::table('competency_evaluations')
                ->join('enrollments', 'competency_evaluations.enrollment_id', '=', 'enrollments.id')
                ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
                ->join('module_competencies', 'competency_evaluations.module_competency_id', '=', 'module_competencies.id')
                ->select('trainees.trainee_number', 'trainees.first_name', 'trainees.last_name', 'module_competencies.name', 'competency_evaluations.status', 'competency_evaluations.rating', 'competency_evaluations.evaluated_at')
                ->get(),
            default => DB::table('enrollments')
                ->join('trainees', 'enrollments.trainee_id', '=', 'trainees.id')
                ->join('curriculum_versions', 'enrollments.curriculum_version_id', '=', 'curriculum_versions.id')
                ->join('programs', 'curriculum_versions.program_id', '=', 'programs.id')
                ->select('trainees.trainee_number', 'trainees.first_name', 'trainees.last_name', 'programs.name', 'enrollments.status', 'enrollments.enrolled_at', 'enrollments.completed_at')
                ->get(),
        };

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            if ($rows->isNotEmpty()) {
                fputcsv($handle, array_keys((array) $rows->first()));
                foreach ($rows as $row) {
                    fputcsv($handle, (array) $row);
                }
            }
            fclose($handle);
        }, $filename, $headers);
    }
}