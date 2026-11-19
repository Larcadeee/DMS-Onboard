<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompetencyEvaluation;
use App\Models\Enrollment;
use App\Models\ModuleCompetency;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CompetencyController extends Controller
{
    public function index(Request $request)
    {
        $query = ModuleCompetency::with([
            'trainingModule:id,title,curriculum_phase_id',
            'trainingModule.curriculumPhase:id,curriculum_version_id,name',
            'trainingModule.curriculumPhase.curriculumVersion:id,program_id',
            'trainingModule.curriculumPhase.curriculumVersion.program:id,name',
        ])
            ->withCount('evaluations')
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn ($inner) => $inner->where('name', 'ilike', "%{$s}%")->orWhere('code', 'ilike', "%{$s}%"));
            })
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->category))
            ->when($request->filled('module_id'), fn ($q) => $q->where('training_module_id', $request->module_id))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'trainingModule.curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ));

        return $query->orderBy('category')->orderBy('name')->paginate(30);
    }

    public function summary()
    {
        return response()->json([
            'total' => ModuleCompetency::count(),
            'categories' => ModuleCompetency::whereNotNull('category')->distinct()->count('category'),
            'active' => ModuleCompetency::count(),
            'archived' => ModuleCompetency::onlyTrashed()->count(),
            'validated' => CompetencyEvaluation::where('status', 'validated')->count(),
        ]);
    }

    public function evaluations(Request $request)
    {
        $query = CompetencyEvaluation::with([
            'enrollment.trainee:id,first_name,last_name,trainee_number',
            'enrollment.curriculumVersion.program:id,name',
            'competency:id,name,code,training_module_id,category',
            'competency.trainingModule:id,title',
            'evaluator:id,name',
            'validator:id,name',
        ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('trainee_id'), fn ($q) => $q->whereHas(
                'enrollment', fn ($e) => $e->where('trainee_id', $request->trainee_id)
            ))
            ->when($request->filled('competency_id'), fn ($q) => $q->where('module_competency_id', $request->competency_id))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'enrollment.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('search'), fn ($q) => $q->whereHas(
                'enrollment.trainee',
                fn ($t) => $t->whereRaw("(first_name || ' ' || last_name) ilike ?", ['%' . $request->search . '%'])
            ));

        $paginator = $query->orderByDesc('updated_at')->paginate(25);

        $paginator->getCollection()->transform(function ($evaluation) {
            $evaluation->trainee = trim(($evaluation->enrollment?->trainee?->first_name ?? '') . ' ' . ($evaluation->enrollment?->trainee?->last_name ?? ''));
            $evaluation->competency_name = $evaluation->competency?->name;
            $evaluation->program = $evaluation->enrollment?->curriculumVersion?->program?->name;

            return $evaluation;
        });

        return $paginator;
    }

    public function storeEvaluation(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'enrollment_id' => ['required', 'exists:enrollments,id'],
            'module_competency_id' => ['required', 'exists:module_competencies,id'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'status' => ['required', 'in:not_started,in_progress,needs_improvement,competent'],
            'evidence' => ['nullable', 'string'],
            'feedback' => ['nullable', 'string'],
            'strengths' => ['nullable', 'string'],
            'improvement_plan' => ['nullable', 'string'],
        ]);

        $evaluation = DB::transaction(function () use ($data, $request, $audit) {
            $number = CompetencyEvaluation::where('enrollment_id', $data['enrollment_id'])
                ->where('module_competency_id', $data['module_competency_id'])
                ->max('evaluation_number') + 1;

            $evaluation = CompetencyEvaluation::create([
                ...$data,
                'evaluation_number' => $number,
                'evaluator_id' => $request->user()->id,
                'evaluated_at' => now(),
            ]);

            $audit->record($request, 'competency.evaluated', 'CompetencyEvaluation', $evaluation->id, 'Competency evaluation recorded.');

            return $evaluation;
        });

        return response()->json(['message' => 'Competency evaluation recorded.', 'evaluation' => $evaluation], 201);
    }

    public function validateEvaluation(Request $request, CompetencyEvaluation $evaluation, AuditLogger $audit)
    {
        $evaluation->update([
            'status' => 'validated',
            'validated_by' => $request->user()->id,
            'validated_at' => now(),
        ]);

        $audit->record($request, 'competency.validated', 'CompetencyEvaluation', $evaluation->id, 'Competency validated by supervisor.');

        return response()->json(['message' => 'Competency validated.', 'evaluation' => $evaluation]);
    }

    public function evaluationSummary()
    {
        return response()->json(
            CompetencyEvaluation::select('status', DB::raw('count(*) as total'))
                ->groupBy('status')->get()
        );
    }

    public function categories()
    {
        return response()->json(
            ModuleCompetency::whereNotNull('category')->distinct()->orderBy('category')->pluck('category')
        );
    }
}
