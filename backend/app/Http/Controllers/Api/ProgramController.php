<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumPhase;
use App\Models\CurriculumVersion;
use App\Models\Enrollment;
use App\Models\Program;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProgramController extends Controller
{
    public function index(Request $request)
    {
        $query = Program::query()
            ->withCount(['curriculumVersions', 'enrollments'])
            ->with(['curriculumVersions' => fn ($q) => $q->withCount('phases')->orderByDesc('id')])
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn ($inner) => $inner->where('name', 'ilike', "%{$s}%")->orWhere('code', 'ilike', "%{$s}%"));
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to));

        $paginator = $query->orderByDesc('created_at')->paginate(20);

        $paginator->getCollection()->transform(function ($program) {
            $version = $program->curriculumVersions->first();

            return [
                'id' => $program->id,
                'code' => $program->code,
                'name' => $program->name,
                'description' => $program->description,
                'objectives' => $program->objectives,
                'target_participants' => $program->target_participants,
                'duration_days' => $program->duration_days,
                'start_date' => $program->start_date,
                'end_date' => $program->end_date,
                'status' => $program->status,
                'is_active' => $program->is_active,
                'phases' => $version?->phases_count ?? 0,
                'trainees' => $program->enrollments_count,
                'versions' => $program->curriculumVersions_count,
                'curriculum_version_id' => $version?->id,
                'created_at' => $program->created_at,
            ];
        });

        return $paginator;
    }

    public function summary()
    {
        return response()->json([
            'total' => Program::count(),
            'active' => Program::where('status', 'active')->count(),
            'draft' => Program::where('status', 'draft')->count(),
            'archived' => Program::where('status', 'archived')->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate($this->rules());

        $program = DB::transaction(function () use ($data, $request, $audit) {
            $program = Program::create([...$data, 'created_by' => $request->user()->id]);

            if ($request->boolean('create_default_curriculum', true)) {
                $version = CurriculumVersion::create([
                    'program_id' => $program->id,
                    'version_number' => '1.0',
                    'title' => $program->name . ' Curriculum',
                    'status' => 'draft',
                ]);

                CurriculumPhase::create([
                    'curriculum_version_id' => $version->id,
                    'phase_number' => 1,
                    'name' => 'Organizational Orientation',
                    'sort_order' => 1,
                ]);
            }

            $audit->record($request, 'program.created', 'Program', $program->id, 'Onboarding program created.');

            return $program;
        });

        return response()->json(['message' => 'Program created successfully.', 'program' => $program], 201);
    }

    public function show(Program $program)
    {
        $program->load([
            'curriculumVersions.phases.modules.competencies',
            'materials:id,title,status,program_id',
        ]);

        return response()->json([
            'program' => $program,
            'trainees_count' => Enrollment::whereHas('curriculumVersion', fn ($q) => $q->where('program_id', $program->id))->count(),
        ]);
    }

    public function update(Request $request, Program $program, AuditLogger $audit)
    {
        $data = $request->validate($this->rules($program));

        $program->update($data);
        $audit->record($request, 'program.updated', 'Program', $program->id, 'Onboarding program updated.');

        return response()->json(['message' => 'Program updated successfully.', 'program' => $program]);
    }

    public function archive(Request $request, Program $program, AuditLogger $audit)
    {
        $active = Enrollment::whereHas('curriculumVersion', fn ($q) => $q->where('program_id', $program->id))
            ->whereIn('status', ['enrolled', 'ongoing', 'pending_review'])->count();

        if ($active > 0 && ! $request->boolean('force')) {
            return response()->json([
                'message' => "This program has {$active} active trainee enrollment(s). Archive it only after resolving them.",
            ], 422);
        }

        $program->update(['status' => 'archived', 'is_active' => false]);
        $audit->record($request, 'program.archived', 'Program', $program->id, 'Onboarding program archived.');

        return response()->json(['message' => 'Program archived successfully.']);
    }

    protected function rules(?Program $program = null): array
    {
        return [
            'code' => ['required', 'string', 'max:100', Rule::unique('programs', 'code')->ignore($program?->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'target_participants' => ['nullable', 'string'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'in:draft,active,archived'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}

