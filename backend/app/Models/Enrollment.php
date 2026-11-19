<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enrollment extends Model
{
    protected $fillable = [
        'enrollment_number',
        'trainee_id',
        'curriculum_version_id',
        'assigned_by',
        'assigned_trainer_id',
        'assigned_supervisor_id',
        'current_phase_id',
        'final_approved_by',
        'submitted_for_review_at',
        'final_approved_at',
        'status',
        'enrolled_at',
        'started_at',
        'completed_at',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'submitted_for_review_at' => 'datetime',
            'final_approved_at' => 'datetime',
        ];
    }

    public function trainee(): BelongsTo
    {
        return $this->belongsTo(Trainee::class);
    }

    public function curriculumVersion(): BelongsTo
    {
        return $this->belongsTo(CurriculumVersion::class);
    }

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_trainer_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_supervisor_id');
    }

    public function currentPhase(): BelongsTo
    {
        return $this->belongsTo(CurriculumPhase::class, 'current_phase_id');
    }

    public function moduleCompletions(): HasMany
    {
        return $this->hasMany(ModuleCompletion::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(SessionAttendance::class);
    }

    public function assessmentAttempts()
{
    return $this->hasMany(AssessmentAttempt::class);
}

public function competencyEvaluations()
{
    return $this->hasMany(CompetencyEvaluation::class);
}
}