<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModuleCompetency extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'training_module_id',
        'code',
        'name',
        'description',
        'category',
        'expected_performance',
        'evaluation_criteria',
        'performance_criteria',
        'is_required',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'performance_criteria' => 'array',
            'is_required' => 'boolean',
        ];
    }

    public function trainingModule(): BelongsTo
    {
        return $this->belongsTo(TrainingModule::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(CompetencyEvaluation::class);
    }
}