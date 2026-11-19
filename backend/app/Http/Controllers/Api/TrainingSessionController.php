<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\SessionAttendance;
use App\Models\TrainingSession;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TrainingSessionController extends Controller
{
    public function index(Request $request)
    {
        $query = TrainingSession::with([
            'trainingModule.curriculumPhase.curriculumVersion.program',
            'attendances',
        ])
            ->withCount(['attendances as participants_count'])
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'ilike', '%' . $request->search . '%'))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('module_id'), fn ($q) => $q->where('training_module_id', $request->module_id))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'trainingModule.curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('phase_id'), fn ($q) => $q->whereHas(
                'trainingModule',
                fn ($m) => $m->where('curriculum_phase_id', $request->phase_id)
            ))
            ->when($request->filled('trainer_id'), fn ($q) => $q->whereHas(
                'attendances.enrollment',
                fn ($e) => $e->where('assigned_trainer_id', $request->trainer_id)
            ))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('starts_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('starts_at', '<=', $request->date_to));

        $paginator = $query->orderBy('starts_at')->paginate(20);

        $paginator->getCollection()->transform(function ($session) {
            $session->program = $session->trainingModule?->curriculumPhase?->curriculumVersion?->program?->name;
            $session->module = $session->trainingModule?->title;
            $session->present_count = $session->attendances->whereIn('attendance_status', ['present', 'late'])->count();

            return $session;
        });

        return $paginator;
    }

    public function summary()
    {
        return response()->json([
            'today' => TrainingSession::whereDate('starts_at', today())->where('status', 'scheduled')->count(),
            'upcoming' => TrainingSession::where('starts_at', '>', now())->where('status', 'scheduled')->count(),
            'completed' => TrainingSession::where('status', 'completed')->count(),
            'cancelled' => TrainingSession::whereIn('status', ['cancelled', 'rescheduled'])->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate($this->rules());

        $session = DB::transaction(function () use ($data, $request, $audit) {
            $session = TrainingSession::create([
                ...collect($data)->except(['enrollment_ids'])->all(),
                'status' => $data['status'] ?? 'scheduled',
                'created_by' => $request->user()->id,
            ]);

            $enrollments = $this->resolveEnrollments($data);

            foreach ($enrollments as $enrollment) {
                SessionAttendance::firstOrCreate(
                    ['training_session_id' => $session->id, 'enrollment_id' => $enrollment->id],
                    ['attendance_status' => 'unmarked']
                );
            }

            $audit->record($request, 'session.created', 'TrainingSession', $session->id, 'Training session scheduled.');

            return $session;
        });

        return response()->json(['message' => 'Training session created.', 'session' => $session->load('trainingModule')], 201);
    }

    public function show(TrainingSession $session)
    {
        $session->load([
            'trainingModule.curriculumPhase.curriculumVersion.program',
            'attendances.enrollment.trainee.user:id,name,email',
            'attendances.enrollment.trainee',
        ]);

        return response()->json(['session' => $session]);
    }

    public function update(Request $request, TrainingSession $session, AuditLogger $audit)
    {
        $data = $request->validate($this->rules(false));

        DB::transaction(function () use ($session, $data, $request, $audit) {
            $session->update(collect($data)->except(['enrollment_ids'])->all());

            if (isset($data['enrollment_ids'])) {
                foreach ($this->resolveEnrollments($data) as $enrollment) {
                    SessionAttendance::firstOrCreate(
                        ['training_session_id' => $session->id, 'enrollment_id' => $enrollment->id],
                        ['attendance_status' => 'unmarked']
                    );
                }
            }

            $audit->record($request, 'session.updated', 'TrainingSession', $session->id, 'Training session updated.');
        });

        return response()->json(['message' => 'Training session updated.', 'session' => $session->fresh()]);
    }

    public function cancel(Request $request, TrainingSession $session, AuditLogger $audit)
    {
        $data = $request->validate(['reason' => ['nullable', 'string']]);
        $session->update(['status' => 'cancelled']);
        $audit->record($request, 'session.cancelled', 'TrainingSession', $session->id, $data['reason'] ?? 'Session cancelled.');

        return response()->json(['message' => 'Session cancelled.']);
    }

    public function complete(Request $request, TrainingSession $session, AuditLogger $audit)
    {
        $session->update(['status' => 'completed']);
        $audit->record($request, 'session.completed', 'TrainingSession', $session->id, 'Session marked completed.');

        return response()->json(['message' => 'Session marked as completed.']);
    }

    public function destroy(Request $request, TrainingSession $session, AuditLogger $audit)
    {
        $session->update(['status' => 'cancelled']);
        $audit->record($request, 'session.cancelled', 'TrainingSession', $session->id, 'Session cancelled.');

        return response()->json(['message' => 'Session cancelled.']);
    }

    protected function resolveEnrollments(array $data)
    {
        if (! empty($data['enrollment_ids'])) {
            return Enrollment::whereIn('id', $data['enrollment_ids'])->get();
        }

        if (! empty($data['program_id'])) {
            return Enrollment::whereHas(
                'curriculumVersion',
                fn ($q) => $q->where('program_id', $data['program_id'])
            )->whereIn('status', ['enrolled', 'ongoing'])->get();
        }

        return Enrollment::whereIn('status', ['enrolled', 'ongoing'])->get();
    }

    protected function rules(bool $creating = true): array
    {
        return [
            'training_module_id' => [$creating ? 'required' : 'sometimes', 'exists:training_modules,id'],
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'session_type' => ['nullable', 'in:classroom,practical,scenario,online,field'],
            'delivery_mode' => ['nullable', 'in:onsite,online,hybrid'],
            'starts_at' => [$creating ? 'required' : 'sometimes', 'date'],
            'ends_at' => [$creating ? 'required' : 'sometimes', 'date', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:scheduled,completed,cancelled,rescheduled'],
            'enrollment_ids' => ['nullable', 'array'],
            'enrollment_ids.*' => ['integer', 'exists:enrollments,id'],
            'program_id' => ['nullable', 'exists:programs,id'],
        ];
    }
}
