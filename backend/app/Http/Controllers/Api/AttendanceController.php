<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SessionAttendance;
use App\Models\TrainingSession;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = SessionAttendance::query()
            ->with([
                'trainingSession:id,title,starts_at,training_module_id,status',
                'trainingSession.trainingModule.curriculumPhase.curriculumVersion.program',
                'enrollment.trainee:id,first_name,last_name,trainee_number',
                'enrollment.trainer:id,name',
            ])
            ->when($request->filled('session_id'), fn ($q) => $q->where('training_session_id', $request->session_id))
            ->when($request->filled('status'), fn ($q) => $q->where('attendance_status', $request->status))
            ->when($request->filled('trainee_id'), fn ($q) => $q->whereHas(
                'enrollment', fn ($e) => $e->where('trainee_id', $request->trainee_id)
            ))
            ->when($request->filled('program_id'), fn ($q) => $q->whereHas(
                'trainingSession.trainingModule.curriculumPhase.curriculumVersion',
                fn ($v) => $v->where('program_id', $request->program_id)
            ))
            ->when($request->filled('phase_id'), fn ($q) => $q->whereHas(
                'trainingSession.trainingModule',
                fn ($m) => $m->where('curriculum_phase_id', $request->phase_id)
            ))
            ->when($request->filled('trainer_id'), fn ($q) => $q->whereHas(
                'enrollment', fn ($e) => $e->where('assigned_trainer_id', $request->trainer_id)
            ))
            ->when($request->filled('date_from'), fn ($q) => $q->whereHas(
                'trainingSession', fn ($s) => $s->whereDate('starts_at', '>=', $request->date_from)
            ))
            ->when($request->filled('date_to'), fn ($q) => $q->whereHas(
                'trainingSession', fn ($s) => $s->whereDate('starts_at', '<=', $request->date_to)
            ));

        $paginator = $query->orderByDesc('updated_at')->paginate(25);

        $paginator->getCollection()->transform(function ($record) {
            $record->date = $record->trainingSession?->starts_at;
            $record->session = $record->trainingSession?->title;
            $record->trainee = trim(($record->enrollment?->trainee?->first_name ?? '') . ' ' . ($record->enrollment?->trainee?->last_name ?? ''));
            $record->trainee_number = $record->enrollment?->trainee?->trainee_number;
            $record->program = $record->trainingSession?->trainingModule?->curriculumPhase?->curriculumVersion?->program?->name;
            $record->trainer = $record->enrollment?->trainer?->name;

            return $record;
        });

        return $paginator;
    }

    public function summary()
    {
        $row = SessionAttendance::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN attendance_status = 'excused' THEN 1 ELSE 0 END) as excused
        ")->first();

        return response()->json($row);
    }

    public function sheet(TrainingSession $session)
    {
        $session->load([
            'trainingModule.curriculumPhase.curriculumVersion.program',
            'attendances.enrollment.trainee',
            'attendances.enrollment.trainer:id,name',
        ]);

        return response()->json(['session' => $session]);
    }

    public function saveSheet(Request $request, TrainingSession $session, AuditLogger $audit)
    {
        $data = $request->validate([
            'records' => ['required', 'array'],
            'records.*.enrollment_id' => ['required', 'exists:enrollments,id'],
            'records.*.attendance_status' => ['required', 'in:present,absent,late,excused,unmarked'],
            'records.*.check_in_at' => ['nullable', 'date'],
            'records.*.check_out_at' => ['nullable', 'date'],
            'records.*.remarks' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($data, $session, $request, $audit) {
            foreach ($data['records'] as $record) {
                SessionAttendance::updateOrCreate(
                    [
                        'training_session_id' => $session->id,
                        'enrollment_id' => $record['enrollment_id'],
                    ],
                    [
                        'attendance_status' => $record['attendance_status'],
                        'check_in_at' => $record['check_in_at'] ?? null,
                        'check_out_at' => $record['check_out_at'] ?? null,
                        'remarks' => $record['remarks'] ?? null,
                        'recorded_by' => $request->user()->id,
                    ]
                );
            }

            $audit->record($request, 'attendance.updated', 'TrainingSession', $session->id, 'Attendance recorded for session.');
        });

        return response()->json(['message' => 'Attendance saved successfully.']);
    }

    public function update(Request $request, SessionAttendance $attendance, AuditLogger $audit)
    {
        $data = $request->validate([
            'attendance_status' => ['required', 'in:present,absent,late,excused,unmarked'],
            'check_in_at' => ['nullable', 'date'],
            'check_out_at' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $attendance->update([...$data, 'recorded_by' => $request->user()->id]);
        $audit->record($request, 'attendance.updated', 'SessionAttendance', $attendance->id, 'Attendance record updated.');

        return response()->json(['message' => 'Attendance updated.', 'attendance' => $attendance]);
    }
}
