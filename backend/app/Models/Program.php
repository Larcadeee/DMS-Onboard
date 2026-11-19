<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Program extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'objectives',
        'target_participants',
        'duration_days',
        'start_date',
        'end_date',
        'status',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function curriculumVersions(): HasMany
    {
        return $this->hasMany(CurriculumVersion::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(TrainingMaterial::class);
    }

    public function enrollments(): HasManyThrough
    {
        return $this->hasManyThrough(Enrollment::class, CurriculumVersion::class);
    }
}