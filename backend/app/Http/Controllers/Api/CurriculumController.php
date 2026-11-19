<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumPhase;
use App\Models\CurriculumVersion;
use App\Models\ModuleCompetency;
use App\Models\Program;
use App\Models\TrainingModule;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CurriculumController extends Controller
{
    public function show(Program $program)
    {
        $program->load([
            'curriculumVersions.phases.modules.competencies',
            'curriculumVersions.phases.modules.assessments',
            'curriculumVersions.phases.modules.sessions:id,training_module_id,title,starts_at,status',
        ]);

        return response()->json(['program' => $program]);
    }

    public function storeVersion(Request $request, Program $program, AuditLogger $audit)
    {
        $data = $request->validate([
            'version_number' => ['required', 'string', 'max:30', Rule::unique('curriculum_versions', 'version_number')->where('program_id', $program->id)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'effective_from' => ['nullable', 'date'],
            'status' => ['nullable', 'in:draft,published,archived'],
        ]);

        $version = CurriculumVersion::create([...$data, 'program_id' => $program->id]);
        $audit->record($request, 'curriculum.version_created', 'CurriculumVersion', $version->id, 'Curriculum version created.');

        return response()->json(['message' => 'Curriculum version created.', 'version' => $version], 201);
    }

    public function updateVersion(Request $request, CurriculumVersion $version, AuditLogger $audit)
    {
        $data = $request->validate([
            'version_number' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('curriculum_versions', 'version_number')->where('program_id', $version->program_id)->ignore($version->id)],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'effective_from' => ['nullable', 'date'],
            'status' => ['nullable', 'in:draft,published,archived'],
        ]);

        $version->update($data);
        $audit->record($request, 'curriculum.version_updated', 'CurriculumVersion', $version->id, 'Curriculum version updated.');

        return response()->json(['message' => 'Curriculum version updated.', 'version' => $version]);
    }

    public function publishVersion(Request $request, CurriculumVersion $version, AuditLogger $audit)
    {
        $version->update(['status' => 'published', 'published_at' => now()]);
        $audit->record($request, 'curriculum.version_published', 'CurriculumVersion', $version->id, 'Curriculum version published.');

        return response()->json(['message' => 'Curriculum published.', 'version' => $version]);
    }

    public function storePhase(Request $request, CurriculumVersion $version, AuditLogger $audit)
    {
        $data = $request->validate([
            'phase_number' => ['required', 'integer', 'min:1', Rule::unique('curriculum_phases', 'phase_number')->where('curriculum_version_id', $version->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $phase = CurriculumPhase::create([
            ...$data,
            'curriculum_version_id' => $version->id,
            'sort_order' => $data['sort_order'] ?? $data['phase_number'],
        ]);

        $audit->record($request, 'curriculum.phase_created', 'CurriculumPhase', $phase->id, 'Curriculum phase created.');

        return response()->json(['message' => 'Phase created.', 'phase' => $phase], 201);
    }

    public function updatePhase(Request $request, CurriculumPhase $phase, AuditLogger $audit)
    {
        $data = $request->validate([
            'phase_number' => ['sometimes', 'integer', 'min:1', Rule::unique('curriculum_phases', 'phase_number')->where('curriculum_version_id', $phase->curriculum_version_id)->ignore($phase->id)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $phase->update($data);
        $audit->record($request, 'curriculum.phase_updated', 'CurriculumPhase', $phase->id, 'Curriculum phase updated.');

        return response()->json(['message' => 'Phase updated.', 'phase' => $phase]);
    }

    public function destroyPhase(CurriculumPhase $phase)
    {
        if ($phase->modules()->exists()) {
            return response()->json(['message' => 'Remove the modules in this phase before deleting it.'], 422);
        }

        $phase->delete();

        return response()->json(['message' => 'Phase deleted.']);
    }

    public function reorderPhases(Request $request, CurriculumVersion $version)
    {
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer', 'exists:curriculum_phases,id'],
        ]);

        foreach ($data['order'] as $index => $phaseId) {
            CurriculumPhase::where('id', $phaseId)
                ->where('curriculum_version_id', $version->id)
                ->update(['sort_order' => $index + 1]);
        }

        return response()->json(['message' => 'Phase order updated.']);
    }

    public function storeModule(Request $request, CurriculumPhase $phase, AuditLogger $audit)
    {
        $data = $request->validate($this->moduleRules());

        $module = TrainingModule::create([
            ...$data,
            'curriculum_phase_id' => $phase->id,
            'sort_order' => $data['sort_order'] ?? (TrainingModule::where('curriculum_phase_id', $phase->id)->max('sort_order') + 1),
        ]);

        $audit->record($request, 'curriculum.module_created', 'TrainingModule', $module->id, 'Training module created.');

        return response()->json(['message' => 'Module created.', 'module' => $module], 201);
    }

    public function updateModule(Request $request, TrainingModule $module, AuditLogger $audit)
    {
        $data = $request->validate($this->moduleRules($module));

        $module->update($data);
        $audit->record($request, 'curriculum.module_updated', 'TrainingModule', $module->id, 'Training module updated.');

        return response()->json(['message' => 'Module updated.', 'module' => $module]);
    }

    public function destroyModule(TrainingModule $module)
    {
        if ($module->assessments()->exists() || $module->sessions()->exists()) {
            return response()->json(['message' => 'This module is referenced by assessments or sessions and cannot be deleted.'], 422);
        }

        $module->delete();

        return response()->json(['message' => 'Module archived.']);
    }

    public function storeCompetency(Request $request, TrainingModule $module, AuditLogger $audit)
    {
        $data = $request->validate($this->competencyRules($module));

        $competency = ModuleCompetency::create([
            ...$data,
            'training_module_id' => $module->id,
            'sort_order' => $data['sort_order'] ?? (ModuleCompetency::where('training_module_id', $module->id)->max('sort_order') + 1),
        ]);

        $audit->record($request, 'competency.created', 'ModuleCompetency', $competency->id, 'Competency created.');

        return response()->json(['message' => 'Competency created.', 'competency' => $competency], 201);
    }

    public function updateCompetency(Request $request, ModuleCompetency $competency, AuditLogger $audit)
    {
        $data = $request->validate($this->competencyRules($competency));

        $competency->update($data);
        $audit->record($request, 'competency.updated', 'ModuleCompetency', $competency->id, 'Competency updated.');

        return response()->json(['message' => 'Competency updated.', 'competency' => $competency]);
    }

    public function destroyCompetency(ModuleCompetency $competency)
    {
        $competency->delete();

        return response()->json(['message' => 'Competency archived. Existing evaluations were retained.']);
    }

    protected function moduleRules(?TrainingModule $module = null): array
    {
        return [
            'code' => ['required', 'string', 'max:100', Rule::unique('training_modules', 'code')->ignore($module?->id)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'learning_objectives' => ['nullable', 'array'],
            'learning_objectives.*' => ['string'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_required' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    protected function competencyRules(?ModuleCompetency $competency = null): array
    {
        return [
            'code' => ['required', 'string', 'max:100', Rule::unique('module_competencies', 'code')->ignore($competency?->id)],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'expected_performance' => ['nullable', 'string'],
            'evaluation_criteria' => ['nullable', 'string'],
            'is_required' => ['nullable', 'boolean'],
        ];
    }
}
