<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentQuestion extends Model
{
    protected $fillable = [
        'assessment_id',
        'question_type',
        'question_text',
        'options',
        'correct_answer',
        'points',
        'sort_order',
        'is_required',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
            'points' => 'decimal:2',
            'is_required' => 'boolean',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function responses(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(AssessmentResponse::class);
    }
}