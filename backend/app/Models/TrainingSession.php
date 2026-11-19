<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSession extends Model
{
    protected $fillable = [
        'training_module_id',
        'title',
        'description',
        'session_type',
        'delivery_mode',
        'starts_at',
        'ends_at',
        'location',
        'capacity',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function trainingModule(): BelongsTo
    {
        return $this->belongsTo(TrainingModule::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(SessionAttendance::class);
    }
}