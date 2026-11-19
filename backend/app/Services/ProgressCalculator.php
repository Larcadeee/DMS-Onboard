<?php

namespace App\Services;

use App\Models\Enrollment;

class ProgressCalculator
{
    public function forEnrollment(Enrollment $enrollment): array
    {
        $enrollment->loadMissing([
            'trainee',
            'curriculumVersion.program',
            'curriculumVersion.phases.modules',
            'curriculumVersion.phases.modules.competencies',
            'curriculumVersion.phases.modules.assessments',
            'assessmentAttempts.assessment',
            'moduleCompletions',
            'attendances',
            'assessmentAttempts',
            'competencyEvaluations',
            'currentPhase',
        ]);

        $modules = collect();
        foreach ($enrollment->curriculumVersion?->phases ?? [] as $phase) {
            foreach ($phase->modules as $module) {
                $modules->push($module);
            }
        }

        $requiredModules = $modules->where('is_required', true);
        $completedIds = $enrollment->moduleCompletions->pluck('training_module_id')->all();
        $completedModules = $requiredModules->whereIn('id', $completedIds)->count();

        $attendance = $enrollment->attendances;
        $attendanceTotal = $attendance->count();
        $attendancePresent = $attendance->whereIn('attendance_status', ['present', 'late'])->count();
        $attendanceRate = $attendanceTotal ? round($attendancePresent / $attendanceTotal * 100) : 100;

        $assessments = collect();
        foreach ($modules as $module) {
            foreach ($module->assessments ?? [] as $assessment) {
                $assessments->push($assessment);
            }
        }

        $passedAssessmentIds = $enrollment->assessmentAttempts
            ->filter(function ($attempt) {
                $passing = (float) $attempt->assessment?->passing_score;

                return $attempt->score !== null
                    && (float) $attempt->score >= $passing
                    && in_array($attempt->status, ['evaluated', 'submitted', 'passed'], true);
            })
            ->pluck('assessment_id')
            ->unique()
            ->all();

        $pendingAssessmentIds = $enrollment->assessmentAttempts
            ->where('status', 'submitted')
            ->pluck('assessment_id')
            ->unique()
            ->all();

        $competencies = collect();
        foreach ($modules as $module) {
            foreach ($module->competencies as $competency) {
                $competencies->push($competency);
            }
        }

        $requiredCompetencies = $competencies->where('is_required', true);
        $latestByCompetency = $enrollment->competencyEvaluations
            ->sortByDesc('evaluation_number')
            ->unique('module_competency_id');

        $competentCount = $latestByCompetency
            ->whereIn('status', ['competent', 'validated'])
            ->count();
        $validatedCount = $latestByCompetency->where('status', 'validated')->count();

        $outstanding = [];

        if ($completedModules < $requiredModules->count()) {
            $outstanding[] = ($requiredModules->count() - $completedModules) . ' required module(s) not completed';
        }
        if ($attendanceTotal > 0 && $attendanceRate < 80) {
            $outstanding[] = 'Attendance below 80%';
        }
        $missingAssessments = $assessments->whereNotIn('id', $passedAssessmentIds);
        if ($missingAssessments->isNotEmpty()) {
            $outstanding[] = $missingAssessments->count() . ' assessment(s) not passed';
        }
        if ($pendingAssessmentIds) {
            $outstanding[] = count($pendingAssessmentIds) . ' assessment result(s) pending evaluation';
        }
        $missingCompetencies = $requiredCompetencies->count() - $validatedCount;
        if ($missingCompetencies > 0) {
            $outstanding[] = $missingCompetencies . ' required competence(s) awaiting validation';
        }

        $modulePct = $requiredModules->count() ? $completedModules / $requiredModules->count() * 100 : 100;
        $assessmentPct = $assessments->count() ? count($passedAssessmentIds) / $assessments->count() * 100 : 100;
        $competencyPct = $requiredCompetencies->count() ? $validatedCount / $requiredCompetencies->count() * 100 : 100;

        $progress = (int) round(
            ($modulePct * 0.4) + ($attendanceRate * 0.2) + ($assessmentPct * 0.2) + ($competencyPct * 0.2)
        );

        return [
            'enrollment_id' => $enrollment->id,
            'enrollment_number' => $enrollment->enrollment_number,
            'trainee_id' => $enrollment->trainee_id,
            'trainee' => $enrollment->trainee?->first_name . ' ' . $enrollment->trainee?->last_name,
            'trainee_number' => $enrollment->trainee?->trainee_number,
            'program_id' => $enrollment->curriculumVersion?->program_id,
            'program' => $enrollment->curriculumVersion?->program?->name,
            'curriculum_version' => $enrollment->curriculumVersion?->version_number,
            'current_phase' => $enrollment->currentPhase?->name,
            'trainer' => $enrollment->trainer?->name,
            'supervisor' => $enrollment->supervisor?->name,
            'status' => $enrollment->status,
            'started_at' => $enrollment->started_at ?? $enrollment->enrolled_at,
            'completed_at' => $enrollment->completed_at,
            'submitted_for_review_at' => $enrollment->submitted_for_review_at,
            'final_approved_at' => $enrollment->final_approved_at,
            'modules_total' => $requiredModules->count(),
            'modules_completed' => $completedModules,
            'attendance_total' => $attendanceTotal,
            'attendance_present' => $attendancePresent,
            'attendance_rate' => $attendanceRate,
            'assessments_total' => $assessments->count(),
            'assessments_passed' => count($passedAssessmentIds),
            'assessments_pending' => count($pendingAssessmentIds),
            'competencies_total' => $requiredCompetencies->count(),
            'competencies_competent' => $competentCount,
            'competencies_validated' => $validatedCount,
            'progress' => min(100, $progress),
            'outstanding' => $outstanding,
        ];
    }

    public function requiresApproval(array $progress): bool
    {
        return count($progress['outstanding']) === 0 && $progress['progress'] >= 100;
    }
}
