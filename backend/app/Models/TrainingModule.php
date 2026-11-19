<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingModule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'curriculum_phase_id',
        'code',
        'title',
        'description',
        'learning_objectives',
        'estimated_minutes',
        'sort_order',
        'is_required',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'learning_objectives' => 'array',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function curriculumPhase(): BelongsTo
    {
        return $this->belongsTo(CurriculumPhase::class);
    }

    public function assessments()
{
    return $this->hasMany(Assessment::class);
}

public function sessions()
{
    return $this->hasMany(TrainingSession::class);
}

public function competencies()
{
    return $this->hasMany(ModuleCompetency::class);
}
}