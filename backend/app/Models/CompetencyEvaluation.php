<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompetencyEvaluation extends Model
{
    protected $fillable = [
        'enrollment_id',
        'module_competency_id',
        'evaluation_number',
        'evaluator_id',
        'rating',
        'status',
        'evidence',
        'feedback',
        'validated_by',
        'validated_at',
        'strengths',
        'improvement_plan',
        'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'evaluated_at' => 'datetime',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function competency(): BelongsTo
    {
        return $this->belongsTo(ModuleCompetency::class, 'module_competency_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}