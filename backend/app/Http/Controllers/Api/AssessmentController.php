<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAttempt;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentResponse;
use App\Models\TrainingModule;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssessmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Assessment::with([
            'trainingModule:id,title,curriculum_phase_id',
            'trainingModule.curriculumPhase:id,curriculum_version_id,name',
            'trainingModule.curriculumPhase.curriculumVersion:id,program_id',
            'trainingModule.curriculumPhase.curriculumVersion.program:id,name',
            'evaluator:id,name',
        ])
            ->withCount(['questions', 'attempts'])
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'ilike', '%' . $request->search . '%'))
            ->when($request->filled('module_id'), fn ($q) => $q->where('training_module_id', $request->module_id))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'trainingModule.curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('phase_id'), fn ($q) => $q->whereHas(
                'trainingModule', fn ($m) => $m->where('curriculum_phase_id', $request->phase_id)
            ))
            ->when($request->filled('type'), fn ($q) => $q->where('assessment_type', $request->type))
            ->when($request->filled('status'), function ($q) use ($request) {
                $q->where('is_published', $request->status === 'published');
            });

        return $query->orderByDesc('created_at')->paginate(20);
    }

    public function summary()
    {
        return response()->json([
            'total' => Assessment::count(),
            'draft' => Assessment::where('is_published', false)->count(),
            'published' => Assessment::where('is_published', true)->count(),
            'pending_evaluations' => AssessmentAttempt::where('status', 'submitted')->count(),
            'completed' => AssessmentAttempt::whereIn('status', ['evaluated', 'passed', 'failed'])->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate($this->rules());

        $assessment = Assessment::create([...$data, 'created_by' => $request->user()->id]);
        $audit->record($request, 'assessment.created', 'Assessment', $assessment->id, 'Assessment created.');

        return response()->json(['message' => 'Assessment created successfully.', 'assessment' => $assessment], 201);
    }

    public function show(Assessment $assessment)
    {
        $assessment->load(['trainingModule.curriculumPhase.curriculumVersion.program', 'questions', 'evaluator:id,name']);
        $assessment->attempts_count = $assessment->attempts()->count();

        return response()->json(['assessment' => $assessment]);
    }

    public function update(Request $request, Assessment $assessment, AuditLogger $audit)
    {
        $data = $request->validate($this->rules(false));
        $assessment->update($data);
        $audit->record($request, 'assessment.updated', 'Assessment', $assessment->id, 'Assessment updated.');

        return response()->json(['message' => 'Assessment updated.', 'assessment' => $assessment]);
    }

    public function publish(Request $request, Assessment $assessment, AuditLogger $audit)
    {
        $assessment->update(['is_published' => ! $assessment->is_published]);
        $audit->record($request, 'assessment.published', 'Assessment', $assessment->id, 'Assessment publication changed.');

        return response()->json([
            'message' => $assessment->is_published ? 'Assessment published.' : 'Assessment unpublished.',
            'assessment' => $assessment,
        ]);
    }

    public function destroy(Assessment $assessment)
    {
        if ($assessment->attempts()->exists()) {
            $assessment->update(['is_published' => false]);

            return response()->json(['message' => 'Assessment unpublished. Attempt history was retained.'], 422);
        }

        $assessment->questions()->delete();
        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
    }

    public function storeQuestion(Request $request, Assessment $assessment, AuditLogger $audit)
    {
        $data = $request->validate($this->questionRules());
        $question = $assessment->questions()->create($data);
        $audit->record($request, 'assessment.question_created', 'Assessment', $assessment->id, 'Assessment question added.');

        return response()->json(['message' => 'Question added.', 'question' => $question], 201);
    }

    public function updateQuestion(Request $request, AssessmentQuestion $question)
    {
        $data = $request->validate($this->questionRules(false));
        $question->update($data);

        return response()->json(['message' => 'Question updated.', 'question' => $question]);
    }

    public function destroyQuestion(AssessmentQuestion $question)
    {
        if ($question->responses()->exists()) {
            return response()->json(['message' => 'This question already has responses and cannot be deleted.'], 422);
        }

        $question->delete();

        return response()->json(['message' => 'Question deleted.']);
    }

    public function attempts(Request $request)
    {
        $query = AssessmentAttempt::with([
            'assessment:id,title,assessment_type,passing_score,total_points,training_module_id,release_results',
            'assessment.trainingModule:id,title',
            'assessment.trainingModule.curriculumPhase.curriculumVersion.program:id,name',
            'enrollment.trainee:id,first_name,last_name,trainee_number',
            'evaluator:id,name',
        ])
            ->when($request->filled('search'), fn ($q) => $q->whereHas(
                'assessment', fn ($a) => $a->where('title', 'ilike', '%' . $request->search . '%')
            ))
            ->when($request->filled('assessment_id'), fn ($q) => $q->where('assessment_id', $request->assessment_id))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'assessment.trainingModule.curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('result'), function ($q) use ($request) {
                if ($request->result === 'passed') {
                    $q->whereColumn('score', '>=', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'));
                } elseif ($request->result === 'failed') {
                    $q->whereColumn('score', '<', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'));
                }
            })
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('submitted_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('submitted_at', '<=', $request->date_to));

        $paginator = $query->orderByDesc('created_at')->paginate(25);

        $paginator->getCollection()->transform(function ($attempt) {
            $attempt->trainee = trim(($attempt->enrollment?->trainee?->first_name ?? '') . ' ' . ($attempt->enrollment?->trainee?->last_name ?? ''));
            $attempt->assessment_title = $attempt->assessment?->title;
            $attempt->result = $attempt->score === null
                ? 'pending'
                : ((float) $attempt->score >= (float) $attempt->assessment?->passing_score ? 'passed' : 'failed');

            return $attempt;
        });

        return $paginator;
    }

    public function summaryResults()
    {
        $passed = AssessmentAttempt::whereColumn('score', '>=', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'))->count();
        $failed = AssessmentAttempt::whereNotNull('score')
            ->whereColumn('score', '<', DB::raw('(SELECT passing_score FROM assessments WHERE assessments.id = assessment_attempts.assessment_id)'))->count();

        return response()->json([
            'total' => AssessmentAttempt::count(),
            'passed' => $passed,
            'failed' => $failed,
            'pending' => AssessmentAttempt::where('status', 'submitted')->count(),
            'unreleased' => AssessmentAttempt::where('status', 'evaluated')
                ->whereHas('assessment', fn ($q) => $q->where('release_results', false))->count(),
        ]);
    }

    public function showAttempt(AssessmentAttempt $attempt)
    {
        $attempt->load([
            'assessment.questions',
            'assessment.trainingModule.curriculumPhase.curriculumVersion.program',
            'enrollment.trainee',
            'enrollment.trainer:id,name',
            'responses.question',
        ]);

        return response()->json(['attempt' => $attempt]);
    }

    public function grade(Request $request, AssessmentAttempt $attempt, AuditLogger $audit)
    {
        $data = $request->validate([
            'score' => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string'],
            'responses' => ['nullable', 'array'],
            'responses.*.id' => ['required', 'exists:assessment_responses,id'],
            'responses.*.awarded_points' => ['nullable', 'numeric', 'min:0'],
            'responses.*.evaluator_feedback' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($attempt, $data, $request, $audit) {
            foreach ($data['responses'] ?? [] as $response) {
                $record = AssessmentResponse::find($response['id']);
                if ($record && $record->assessment_attempt_id === $attempt->id) {
                    $record->update([
                        'awarded_points' => $response['awarded_points'] ?? null,
                        'evaluator_feedback' => $response['evaluator_feedback'] ?? null,
                        'evaluated_by' => $request->user()->id,
                    ]);
                }
            }

            $attempt->update([
                'score' => $data['score'],
                'feedback' => $data['feedback'] ?? null,
                'status' => 'evaluated',
                'evaluated_by' => $request->user()->id,
            ]);

            $audit->record($request, 'assessment.graded', 'AssessmentAttempt', $attempt->id, 'Assessment attempt evaluated.');
        });

        return response()->json(['message' => 'Attempt evaluated successfully.', 'attempt' => $attempt->fresh()]);
    }

    public function release(Request $request, Assessment $assessment, AuditLogger $audit)
    {
        $assessment->update(['release_results' => true]);
        $audit->record($request, 'assessment.results_released', 'Assessment', $assessment->id, 'Assessment results released.');

        return response()->json(['message' => 'Results released to trainees.']);
    }

    protected function rules(bool $creating = true): array
    {
        return [
            'training_module_id' => [$creating ? 'required' : 'sometimes', 'exists:training_modules,id'],
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'assessment_type' => ['nullable', 'in:written,practical,scenario'],
            'total_points' => [$creating ? 'required' : 'sometimes', 'numeric', 'min:1'],
            'passing_score' => [$creating ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'attempts_allowed' => ['nullable', 'integer', 'min:1'],
            'is_published' => ['nullable', 'boolean'],
            'release_results' => ['nullable', 'boolean'],
            'available_from' => ['nullable', 'date'],
            'available_to' => ['nullable', 'date', 'after_or_equal:available_from'],
            'evaluator_id' => ['nullable', 'exists:users,id'],
        ];
    }

    protected function questionRules(bool $creating = true): array
    {
        return [
            'question_type' => ['nullable', 'in:multiple_choice,true_false,short_answer,essay'],
            'question_text' => [$creating ? 'required' : 'sometimes', 'string'],
            'options' => ['nullable', 'array'],
            'correct_answer' => ['nullable'],
            'points' => ['nullable', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_required' => ['nullable', 'boolean'],
        ];
    }
}
