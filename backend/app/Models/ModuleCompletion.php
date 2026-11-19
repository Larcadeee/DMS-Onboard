<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleCompletion extends Model
{
    protected $fillable = [
        'enrollment_id', 'training_module_id', 'completed_at', 'completed_by', 'remarks',
    ];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function enrollment(): BelongsTo { return $this->belongsTo(Enrollment::class); }
    public function module(): BelongsTo { return $this->belongsTo(TrainingModule::class, 'training_module_id'); }
}
