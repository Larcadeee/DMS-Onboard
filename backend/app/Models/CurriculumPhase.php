<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CurriculumPhase extends Model
{
    protected $fillable = [
        'curriculum_version_id',
        'phase_number',
        'name',
        'description',
        'duration_days',
        'sort_order',
    ];

    public function curriculumVersion(): BelongsTo
    {
        return $this->belongsTo(CurriculumVersion::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(TrainingModule::class)
            ->orderBy('sort_order');
    }
}