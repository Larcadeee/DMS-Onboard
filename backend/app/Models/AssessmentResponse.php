<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentResponse extends Model
{
    protected $fillable = [
        'assessment_attempt_id',
        'assessment_question_id',
        'answer',
        'awarded_points',
        'evaluated_by',
        'evaluator_feedback',
    ];

    protected function casts(): array
    {
        return [
            'answer' => 'array',
            'awarded_points' => 'decimal:2',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AssessmentAttempt::class, 'assessment_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AssessmentQuestion::class, 'assessment_question_id');
    }
}