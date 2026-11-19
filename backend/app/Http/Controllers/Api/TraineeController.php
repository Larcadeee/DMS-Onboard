<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumVersion;
use App\Models\Enrollment;
use App\Models\ModuleCompletion;
use App\Models\Program;
use App\Models\Trainee;
use App\Models\TraineeDocument;
use App\Models\TrainingModule;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\ProgressCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class TraineeController extends Controller
{
    public function index(Request $request, ProgressCalculator $calculator)
    {
        $query = Trainee::query()
            ->with([
                'user:id,name,first_name,middle_name,last_name,email,profile_photo_path,updated_at',
                'enrollments.curriculumVersion.program',
                'enrollments.currentPhase',
                'enrollments.trainer',
                'enrollments.supervisor',
                'enrollments.moduleCompletions',
                'enrollments.attendances',
                'enrollments.assessmentAttempts.assessment',
                'enrollments.competencyEvaluations',
            ])
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(function ($inner) use ($s) {
                    $inner->where('trainee_number', 'ilike', "%{$s}%")
                        ->orWhere('first_name', 'ilike', "%{$s}%")
                        ->orWhere('last_name', 'ilike', "%{$s}%")
                        ->orWhereHas('user', fn ($u) => $u->where('email', 'ilike', "%{$s}%"));
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('trainee_status', $request->status))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'enrollments.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('trainer_id'), fn ($q) => $q->whereHas(
                'enrollments',
                fn ($e) => $e->where('assigned_trainer_id', $request->trainer_id)
            ))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to));

        $paginator = $query->orderByDesc('created_at')->paginate(20);

        $paginator->getCollection()->transform(function ($trainee) use ($calculator) {
            $enrollment = $trainee->enrollments->sortByDesc('created_at')->first();
            $progress = $enrollment ? $calculator->forEnrollment($enrollment) : null;

            return [
                'id' => $trainee->id,
                'trainee_number' => $trainee->trainee_number,
                'name' => trim("{$trainee->first_name} {$trainee->last_name}"),
                'avatar_url' => $trainee->user?->avatar_url,
                'first_name' => $trainee->first_name,
                'last_name' => $trainee->last_name,
                'email' => $trainee->user?->email,
                'contact_number' => $trainee->contact_number,
                'employment_status' => $trainee->employment_status,
                'status' => $trainee->trainee_status,
                'program' => $enrollment?->curriculumVersion?->program?->name,
                'program_id' => $enrollment?->curriculumVersion?->program_id,
                'trainer' => $enrollment?->trainer?->name,
                'start_date' => $enrollment?->started_at ?? $enrollment?->enrolled_at,
                'current_phase' => $enrollment?->currentPhase?->name,
                'progress' => $progress['progress'] ?? 0,
                'enrollment_id' => $enrollment?->id,
                'created_at' => $trainee->created_at,
            ];
        });

        return $paginator;
    }

    public function summary()
    {
        return response()->json([
            'total' => Trainee::count(),
            'active' => Trainee::where('trainee_status', 'active')->count(),
            'ongoing' => Enrollment::whereIn('status', ['enrolled', 'ongoing'])->count(),
            'completed' => Enrollment::where('status', 'completed')->count(),
            'archived' => Trainee::onlyTrashed()->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'confirmed', Password::min(12)->letters()->numbers()->mixedCase()],
            'trainee_number' => ['nullable', 'string', 'max:50', 'unique:trainees,trainee_number'],
            'date_of_birth' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:20'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:150'],
            'emergency_contact_number' => ['nullable', 'string', 'max:50'],
            'employment_status' => ['nullable', 'string', 'max:50'],
            'trainee_status' => ['nullable', 'string', 'max:50'],
            'program_id' => ['required', 'exists:programs,id'],
            'trainer_id' => ['nullable', 'exists:users,id'],
            'supervisor_id' => ['nullable', 'exists:users,id'],
            'training_start_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $version = CurriculumVersion::where('program_id', $data['program_id'])
            ->orderByDesc('id')->first();

        if (! $version) {
            return response()->json([
                'message' => 'The selected program has no curriculum version. Configure the curriculum first.',
            ], 422);
        }

        $trainee = DB::transaction(function () use ($data, $request, $audit, $version) {
            $user = User::create([
                'name' => trim("{$data['first_name']} {$data['last_name']}"),
                'email' => $data['email'],
                'password' => Hash::make($data['password'] ?? 'Trainee@123456789'),
                'role_id' => \App\Models\Role::where('slug', 'etc_trainee')->value('id'),
                'is_active' => true,
                'must_change_password' => true,
            ]);

            $trainee = Trainee::create([
                ...collect($data)->only([
                    'first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth', 'sex',
                    'contact_number', 'address', 'emergency_contact_name', 'emergency_contact_number',
                    'employment_status', 'trainee_status', 'remarks',
                ])->all(),
                'user_id' => $user->id,
                'trainee_number' => $data['trainee_number'] ?? 'ETC-' . str_pad((string) (Trainee::withTrashed()->count() + 1), 5, '0', STR_PAD_LEFT),
            ]);

            $firstPhase = $version->phases()->orderBy('sort_order')->first();

            Enrollment::create([
                'enrollment_number' => 'ENR-' . now()->format('Ymd') . '-' . str_pad((string) (Enrollment::count() + 1), 4, '0', STR_PAD_LEFT),
                'trainee_id' => $trainee->id,
                'curriculum_version_id' => $version->id,
                'assigned_by' => $request->user()->id,
                'assigned_trainer_id' => $data['trainer_id'] ?? null,
                'assigned_supervisor_id' => $data['supervisor_id'] ?? null,
                'current_phase_id' => $firstPhase?->id,
                'status' => 'ongoing',
                'enrolled_at' => now(),
                'started_at' => $data['training_start_date'] ?? now(),
            ]);

            $audit->record($request, 'trainee.created', 'Trainee', $trainee->id, 'Trainee registered and enrolled.');

            return $trainee;
        });

        return response()->json(['message' => 'Trainee created successfully.', 'trainee' => $trainee->load('user', 'enrollments')], 201);
    }

    public function show(Trainee $trainee, ProgressCalculator $calculator, Request $request)
    {
        $this->authorizeTraineeAccess($trainee, $request);

        $trainee->load([
            'user:id,name,first_name,middle_name,last_name,email,contact_number,profile_photo_path,last_login_at,updated_at',
            'documents.uploader:id,name',
            'enrollments.curriculumVersion.program',
            'enrollments.curriculumVersion.phases.modules.competencies',
            'enrollments.currentPhase',
            'enrollments.trainer:id,name',
            'enrollments.supervisor:id,name',
            'enrollments.moduleCompletions',
            'enrollments.attendances.trainingSession',
            'enrollments.assessmentAttempts.assessment',
            'enrollments.competencyEvaluations.competency',
            'enrollments.competencyEvaluations.evaluator:id,name',
        ]);

        $enrollment = $trainee->enrollments->sortByDesc('created_at')->first();
        $progress = $enrollment ? $calculator->forEnrollment($enrollment) : null;

        return response()->json([
            'trainee' => $trainee,
            'enrollment' => $enrollment,
            'progress' => $progress,
            'history' => $trainee->enrollments->sortByDesc('created_at')->values(),
        ]);
    }

    public function update(Request $request, Trainee $trainee, AuditLogger $audit)
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($trainee->user_id)],
            'trainee_number' => ['sometimes', 'string', 'max:50', Rule::unique('trainees', 'trainee_number')->ignore($trainee->id)],
            'date_of_birth' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:20'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:150'],
            'emergency_contact_number' => ['nullable', 'string', 'max:50'],
            'employment_status' => ['nullable', 'string', 'max:50'],
            'trainee_status' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string'],
            'program_id' => ['sometimes', 'exists:programs,id'],
            'trainer_id' => ['nullable', 'exists:users,id'],
            'supervisor_id' => ['nullable', 'exists:users,id'],
        ]);

        DB::transaction(function () use ($trainee, $data, $request, $audit) {
            $trainee->update(collect($data)->only([
                'first_name', 'middle_name', 'last_name', 'suffix', 'trainee_number', 'date_of_birth',
                'sex', 'contact_number', 'address', 'emergency_contact_name', 'emergency_contact_number',
                'employment_status', 'trainee_status', 'remarks',
            ])->all());

            if (! empty($data['email'])) {
                $trainee->user->update(['email' => $data['email']]);
            }

            $enrollment = $trainee->enrollments()->latest()->first();

            if ($enrollment && (! empty($data['trainer_id']) || ! empty($data['supervisor_id']))) {
                $enrollment->update([
                    'assigned_trainer_id' => $data['trainer_id'] ?? $enrollment->assigned_trainer_id,
                    'assigned_supervisor_id' => $data['supervisor_id'] ?? $enrollment->assigned_supervisor_id,
                ]);
            }

            if ($enrollment && ! empty($data['program_id'])) {
                $version = CurriculumVersion::where('program_id', $data['program_id'])->orderByDesc('id')->first();

                if ($version && $version->id !== $enrollment->curriculum_version_id) {
                    $enrollment->update(['status' => 'transferred', 'completed_at' => now()]);

                    Enrollment::create([
                        'enrollment_number' => 'ENR-' . now()->format('Ymd') . '-' . str_pad((string) (Enrollment::count() + 1), 4, '0', STR_PAD_LEFT),
                        'trainee_id' => $trainee->id,
                        'curriculum_version_id' => $version->id,
                        'assigned_by' => $request->user()->id,
                        'assigned_trainer_id' => $data['trainer_id'] ?? null,
                        'assigned_supervisor_id' => $data['supervisor_id'] ?? null,
                        'current_phase_id' => $version->phases()->orderBy('sort_order')->value('id'),
                        'status' => 'ongoing',
                        'enrolled_at' => now(),
                        'started_at' => now(),
                    ]);
                }
            }

            $audit->record($request, 'trainee.updated', 'Trainee', $trainee->id, 'Trainee record updated.');
        });

        return response()->json(['message' => 'Trainee updated successfully.', 'trainee' => $trainee->fresh()->load('user')]);
    }

    public function archive(Request $request, Trainee $trainee, AuditLogger $audit)
    {
        DB::transaction(function () use ($trainee, $request, $audit) {
            $trainee->update(['trainee_status' => 'archived']);
            $trainee->user?->update(['is_active' => false]);
            $trainee->delete();
            $audit->record($request, 'trainee.archived', 'Trainee', $trainee->id, 'Trainee archived.');
        });

        return response()->json(['message' => 'Trainee archived successfully.']);
    }

    public function uploadDocument(Request $request, Trainee $trainee, AuditLogger $audit)
    {
        $data = $request->validate([
            'document_type' => ['required', 'string', 'max:100'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
        ]);

        $file = $request->file('file');
        $path = $file->store("trainee-documents/{$trainee->id}", 'local');

        $document = TraineeDocument::create([
            'trainee_id' => $trainee->id,
            'document_type' => $data['document_type'],
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        $audit->record($request, 'trainee.document_uploaded', 'Trainee', $trainee->id, 'Document uploaded: ' . $document->original_filename);

        return response()->json(['message' => 'Document uploaded successfully.', 'document' => $document], 201);
    }

    public function downloadDocument(Request $request, Trainee $trainee, TraineeDocument $document)
    {
        $this->authorizeTraineeAccess($trainee, $request);

        abort_unless($document->trainee_id === $trainee->id, 404);

        return Storage::disk('local')->download($document->file_path, $document->original_filename);
    }

    public function deleteDocument(Request $request, Trainee $trainee, TraineeDocument $document, AuditLogger $audit)
    {
        abort_unless($document->trainee_id === $trainee->id, 404);

        Storage::disk('local')->delete($document->file_path);
        $document->delete();
        $audit->record($request, 'trainee.document_deleted', 'Trainee', $trainee->id, 'Document removed.');

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function toggleModule(Request $request, Trainee $trainee, Enrollment $enrollment, TrainingModule $module, AuditLogger $audit)
    {
        abort_unless($enrollment->trainee_id === $trainee->id, 404);

        $completed = ModuleCompletion::where('enrollment_id', $enrollment->id)
            ->where('training_module_id', $module->id)->first();

        if ($completed) {
            $completed->delete();
            $message = 'Module marked as incomplete.';
        } else {
            ModuleCompletion::create([
                'enrollment_id' => $enrollment->id,
                'training_module_id' => $module->id,
                'completed_at' => now(),
                'completed_by' => $request->user()->id,
            ]);
            $message = 'Module marked as completed.';
        }

        $audit->record($request, 'trainee.module_toggled', 'Enrollment', $enrollment->id, $message);

        return response()->json(['message' => $message]);
    }

    protected function authorizeTraineeAccess(Trainee $trainee, Request $request): void
    {
        $user = $request->user();

        if ($user->role?->slug === 'etc_trainee' && $trainee->user_id !== $user->id) {
            abort(403, 'You may only access your own trainee record.');
        }
    }
}
