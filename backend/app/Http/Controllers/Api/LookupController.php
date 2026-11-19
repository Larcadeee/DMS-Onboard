<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumPhase;
use App\Models\ModuleCompetency;
use App\Models\Program;
use App\Models\Role;
use App\Models\TrainingModule;
use App\Models\User;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    public function users()
    {
        return User::where('is_active', true)
            ->select('id', 'name', 'email', 'role_id')
            ->orderBy('name')
            ->get();
    }

    public function roles()
    {
        return Role::where('is_active', true)->select('id', 'name', 'slug')->orderBy('name')->get();
    }

    public function modules(Request $request)
    {
        return TrainingModule::with('curriculumPhase:id,name,curriculum_version_id')
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'title', 'curriculum_phase_id']);
    }

    public function phases(Request $request)
    {
        return CurriculumPhase::when($request->filled('program_id'), fn ($q) => $q->whereHas(
            'curriculumVersion',
            fn ($v) => $v->where('program_id', $request->program_id)
        ))
            ->orderBy('sort_order')
            ->get(['id', 'name', 'curriculum_version_id']);
    }

    public function programs()
    {
        return Program::select('id', 'code', 'name', 'status')->orderBy('name')->get();
    }

    public function competencies()
    {
        return ModuleCompetency::select('id', 'code', 'name', 'training_module_id')->orderBy('name')->get();
    }
}
