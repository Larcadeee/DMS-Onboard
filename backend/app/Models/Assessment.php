<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    protected $fillable = [
        'training_module_id',
        'title',
        'instructions',
        'assessment_type',
        'total_points',
        'passing_score',
        'time_limit_minutes',
        'attempts_allowed',
        'is_published',
        'release_results',
        'available_from',
        'available_to',
        'evaluator_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'total_points' => 'decimal:2',
            'passing_score' => 'decimal:2',
            'is_published' => 'boolean',
            'release_results' => 'boolean',
            'available_from' => 'datetime',
            'available_to' => 'datetime',
        ];
    }

    public function trainingModule(): BelongsTo
    {
        return $this->belongsTo(TrainingModule::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class)
            ->orderBy('sort_order');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(AssessmentAttempt::class);
    }
}