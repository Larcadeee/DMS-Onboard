<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAttempt;
use App\Models\AssessmentResponse;
use App\Models\Enrollment;
use App\Models\SessionAttendance;
use App\Models\TrainingMaterial;
use App\Services\AuditLogger;
use App\Services\ProgressCalculator;
use Illuminate\Http\Request;

class TraineePortalController extends Controller
{
    public function dashboard(Request $request, ProgressCalculator $calculator)
    {
        [$trainee, $enrollment] = $this->context($request);
        $progress = $calculator->forEnrollment($enrollment);

        $sessionIds = SessionAttendance::where('enrollment_id', $enrollment->id)->pluck('training_session_id');

        $upcoming = \App\Models\TrainingSession::whereIn('id', $sessionIds)
            ->where('starts_at', '>=', now())->orderBy('starts_at')->limit(5)->get();

        $recentAttendance = SessionAttendance::with('trainingSession:id,title,starts_at')
            ->where('enrollment_id', $enrollment->id)
            ->orderByDesc('updated_at')->limit(5)->get();

        $releasedResults = AssessmentAttempt::with('assessment:id,title,assessment_type,passing_score')
            ->where('enrollment_id', $enrollment->id)
            ->whereNotNull('score')
            ->whereHas('assessment', fn ($q) => $q->where('release_results', true))
            ->orderByDesc('updated_at')->limit(5)->get();

        $competencies = $enrollment->competencyEvaluations()
            ->with('competency:id,name,code')
            ->whereNotNull('evaluated_at')
            ->orderByDesc('updated_at')->limit(5)->get();

        return response()->json([
            'trainee' => $trainee,
            'enrollment' => $enrollment->load('curriculumVersion.program', 'currentPhase'),
            'progress' => $progress,
            'upcoming_sessions' => $upcoming,
            'recent_attendance' => $recentAttendance,
            'released_results' => $releasedResults,
            'competencies' => $competencies,
        ]);
    }

    public function program(Request $request, ProgressCalculator $calculator)
    {
        [$trainee, $enrollment] = $this->context($request);

        $enrollment->load([
            'curriculumVersion.program',
            'curriculumVersion.phases.modules',
            'curriculumVersion.phases.modules.competencies',
            'moduleCompletions',
            'currentPhase',
            'trainer:id,name',
        ]);

        $progress = $calculator->forEnrollment($enrollment);

        $completedIds = $enrollment->moduleCompletions->pluck('training_module_id')->all();
        $phases = $enrollment->curriculumVersion->phases->map(function ($phase) use ($completedIds) {
            $modules = $phase->modules->map(function ($module) use ($completedIds) {
                $module->is_completed = in_array($module->id, $completedIds, true);

                return $module;
            });

            $phase->modules = $modules;
            $phase->completed_modules = $modules->where('is_completed', true)->count();
            $phase->is_completed = $phase->completed_modules === $modules->count() && $modules->count() > 0;

            return $phase;
        });

        return response()->json([
            'trainee' => $trainee,
            'enrollment' => $enrollment,
            'phases' => $phases,
            'progress' => $progress,
        ]);
    }

    public function materials(Request $request)
    {
        [, $enrollment] = $this->context($request);
        $enrollment->load('curriculumVersion.phases.modules');

        $moduleIds = collect($enrollment->curriculumVersion?->phases ?? [])
            ->flatMap(fn ($phase) => $phase->modules->pluck('id'));

        $materials = TrainingMaterial::with(['module:id,title', 'phase:id,name', 'program:id,name'])
            ->where('status', 'published')
            ->where(function ($q) use ($moduleIds, $enrollment) {
                $q->whereIn('training_module_id', $moduleIds)
                    ->orWhere('program_id', $enrollment->curriculumVersion?->program_id);
            })
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['materials' => $materials]);
    }

    public function schedule(Request $request)
    {
        [, $enrollment] = $this->context($request);

        $records = SessionAttendance::with([
            'trainingSession.trainingModule:id,title',
            'trainingSession.trainingModule.curriculumPhase:id,name',
        ])
            ->where('enrollment_id', $enrollment->id)
            ->get();

        $sessions = $records->pluck('trainingSession')->filter()->sortBy('starts_at')->values();

        return response()->json(['sessions' => $sessions, 'attendance' => $records]);
    }

    public function assessments(Request $request)
    {
        [, $enrollment] = $this->context($request);
        $enrollment->load('curriculumVersion.phases.modules');

        $moduleIds = collect($enrollment->curriculumVersion?->phases ?? [])
            ->flatMap(fn ($phase) => $phase->modules->pluck('id'));

        $assessments = Assessment::with('trainingModule:id,title')
            ->whereIn('training_module_id', $moduleIds)
            ->where('is_published', true)
            ->get()
            ->map(function ($assessment) use ($enrollment) {
                $attempts = AssessmentAttempt::where('assessment_id', $assessment->id)
                    ->where('enrollment_id', $enrollment->id)
                    ->orderByDesc('attempt_number')
                    ->get();

                $assessment->attempts = $attempts->map(function ($attempt) use ($assessment) {
                    if (! $assessment->release_results) {
                        $attempt->score = null;
                        $attempt->feedback = null;
                    }

                    return $attempt;
                });
                $assessment->attempts_used = $attempts->count();
                $assessment->can_start = $attempts->count() < $assessment->attempts_allowed
                    && $assessment->assessment_type === 'written';

                return $assessment;
            });

        return response()->json(['assessments' => $assessments]);
    }

    public function startAttempt(Request $request, Assessment $assessment)
    {
        [, $enrollment] = $this->context($request);

        abort_unless($assessment->is_published && $assessment->assessment_type === 'written', 422, 'This assessment is not available.');
        abort_unless($assessment->trainingModule?->curriculumPhase?->curriculum_version_id === $enrollment->curriculum_version_id, 403, 'This assessment is not assigned to you.');

        $used = AssessmentAttempt::where('assessment_id', $assessment->id)
            ->where('enrollment_id', $enrollment->id)->count();

        if ($used >= $assessment->attempts_allowed) {
            return response()->json(['message' => 'You have reached the allowed number of attempts.'], 422);
        }

        $attempt = AssessmentAttempt::create([
            'assessment_id' => $assessment->id,
            'enrollment_id' => $enrollment->id,
            'attempt_number' => $used + 1,
            'started_at' => now(),
            'status' => 'in_progress',
        ]);

        $questions = $assessment->questions()->get(['id', 'question_type', 'question_text', 'options', 'points']);

        return response()->json(['message' => 'Attempt started.', 'attempt' => $attempt, 'questions' => $questions], 201);
    }

    public function submitAttempt(Request $request, AssessmentAttempt $attempt, AuditLogger $audit)
    {
        [, $enrollment] = $this->context($request);

        abort_unless($attempt->enrollment_id === $enrollment->id, 403);
        abort_unless($attempt->status === 'in_progress', 422, 'This attempt was already submitted.');

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'exists:assessment_questions,id'],
            'answers.*.answer' => ['nullable'],
        ]);

        $assessment = $attempt->assessment;
        $autoGradable = true;
        $score = 0;

        foreach ($data['answers'] as $answer) {
            $question = $assessment->questions()->find($answer['question_id']);
            if (! $question) {
                continue;
            }

            AssessmentResponse::updateOrCreate(
                ['assessment_attempt_id' => $attempt->id, 'assessment_question_id' => $question->id],
                ['answer' => ['value' => $answer['answer']]]
            );

            if (in_array($question->question_type, ['multiple_choice', 'true_false'], true) && $question->correct_answer !== null) {
                $expected = is_array($question->correct_answer)
                    ? ($question->correct_answer['value'] ?? reset($question->correct_answer))
                    : $question->correct_answer;

                if ((string) $expected === (string) $answer['answer']) {
                    $score += (float) $question->points;
                }
            } else {
                $autoGradable = false;
            }
        }

        $attempt->update([
            'submitted_at' => now(),
            'status' => $autoGradable ? 'evaluated' : 'submitted',
            'score' => $autoGradable ? $score : null,
        ]);

        $audit->record($request, 'assessment.submitted', 'AssessmentAttempt', $attempt->id, 'Trainee submitted an assessment attempt.');

        return response()->json([
            'message' => 'Assessment submitted successfully.',
            'attempt' => $attempt->fresh(),
        ]);
    }

    public function competencies(Request $request)
    {
        [, $enrollment] = $this->context($request);

        $evaluations = $enrollment->competencyEvaluations()
            ->with(['competency:id,code,name,category,expected_performance,evaluation_criteria', 'evaluator:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['evaluations' => $evaluations]);
    }

    public function attendance(Request $request)
    {
        [, $enrollment] = $this->context($request);

        $records = SessionAttendance::with([
            'trainingSession:id,title,starts_at,ends_at,location,status',
            'trainingSession.trainingModule:id,title',
        ])
            ->where('enrollment_id', $enrollment->id)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'attendance' => $records,
            'summary' => [
                'total' => $records->count(),
                'present' => $records->where('attendance_status', 'present')->count(),
                'absent' => $records->where('attendance_status', 'absent')->count(),
                'late' => $records->where('attendance_status', 'late')->count(),
                'excused' => $records->where('attendance_status', 'excused')->count(),
            ],
        ]);
    }

    public function history(Request $request, ProgressCalculator $calculator)
    {
        [$trainee] = $this->context($request);

        $enrollments = Enrollment::with([
            'curriculumVersion.program', 'currentPhase', 'moduleCompletions',
            'attendances', 'assessmentAttempts.assessment', 'competencyEvaluations.competency',
        ])->where('trainee_id', $trainee->id)->orderByDesc('created_at')->get();

        $history = $enrollments->map(fn ($enrollment) => $calculator->forEnrollment($enrollment));

        return response()->json(['history' => $history]);
    }

    protected function context(Request $request): array
    {
        $user = $request->user();
        $trainee = $user->trainee;

        abort_unless($trainee, 403, 'No trainee profile is linked to this account.');

        if (str_starts_with($request->path(), 'api/v1/my/')) {
            // own records only
        }

        $enrollment = Enrollment::with([
            'curriculumVersion.program', 'currentPhase', 'trainer', 'supervisor',
            'moduleCompletions', 'attendances', 'assessmentAttempts.assessment', 'competencyEvaluations',
        ])->where('trainee_id', $trainee->id)->orderByDesc('created_at')->first();

        abort_unless($enrollment, 404, 'No onboarding enrollment was found.');

        return [$trainee, $enrollment];
    }
}
