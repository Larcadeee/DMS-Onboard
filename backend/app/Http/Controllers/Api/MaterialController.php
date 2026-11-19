<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingMaterial;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MaterialController extends Controller
{
    public function index(Request $request)
    {
        $query = TrainingMaterial::with(['program:id,name', 'phase:id,name', 'module:id,title', 'uploader:id,name'])
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'ilike', '%' . $request->search . '%'))
            ->when($request->filled('program_id'), fn ($q) => $q->where('program_id', $request->program_id))
            ->when($request->filled('phase_id'), fn ($q) => $q->where('curriculum_phase_id', $request->phase_id))
            ->when($request->filled('module_id'), fn ($q) => $q->where('training_module_id', $request->module_id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->document_type));

        return $query->orderByDesc('created_at')->paginate(20);
    }

    public function summary()
    {
        return response()->json([
            'total' => TrainingMaterial::count(),
            'published' => TrainingMaterial::where('status', 'published')->count(),
            'draft' => TrainingMaterial::where('status', 'draft')->count(),
            'archived' => TrainingMaterial::where('status', 'archived')->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate($this->rules());

        $material = new TrainingMaterial($data);
        $material->uploaded_by = $request->user()->id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $material->file_path = $file->store('training-materials', 'local');
            $material->original_filename = $file->getClientOriginalName();
            $material->mime_type = $file->getClientMimeType();
            $material->file_size = $file->getSize();
        }

        $material->save();
        $audit->record($request, 'material.created', 'TrainingMaterial', $material->id, 'Training material uploaded.');

        return response()->json(['message' => 'Material saved successfully.', 'material' => $material], 201);
    }

    public function update(Request $request, TrainingMaterial $material, AuditLogger $audit)
    {
        $data = $request->validate($this->rules(false));

        if ($request->hasFile('file')) {
            if ($material->file_path) {
                Storage::disk('local')->delete($material->file_path);
            }

            $file = $request->file('file');
            $data['file_path'] = $file->store('training-materials', 'local');
            $data['original_filename'] = $file->getClientOriginalName();
            $data['mime_type'] = $file->getClientMimeType();
            $data['file_size'] = $file->getSize();
            $data['version'] = $material->version + 1;
        }

        $material->update($data);
        $audit->record($request, 'material.updated', 'TrainingMaterial', $material->id, 'Training material updated.');

        return response()->json(['message' => 'Material updated successfully.', 'material' => $material]);
    }

    public function download(TrainingMaterial $material)
    {
        abort_unless($material->file_path && Storage::disk('local')->exists($material->file_path), 404, 'File not found.');

        return Storage::disk('local')->download($material->file_path, $material->original_filename);
    }

    public function archive(Request $request, TrainingMaterial $material, AuditLogger $audit)
    {
        $material->update(['status' => 'archived']);
        $material->delete();
        $audit->record($request, 'material.archived', 'TrainingMaterial', $material->id, 'Training material archived.');

        return response()->json(['message' => 'Material archived successfully.']);
    }

    protected function rules(bool $creating = true): array
    {
        return [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'program_id' => [$creating ? 'required' : 'sometimes', 'exists:programs,id'],
            'curriculum_phase_id' => ['nullable', 'exists:curriculum_phases,id'],
            'training_module_id' => ['nullable', 'exists:training_modules,id'],
            'document_type' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'in:draft,published,archived'],
            'file' => [$creating ? 'required' : 'nullable', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,mp4,txt'],
        ];
    }
}
