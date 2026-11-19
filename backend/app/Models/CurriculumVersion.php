<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CurriculumVersion extends Model
{
    protected $fillable = [
        'program_id',
        'version_number',
        'title',
        'description',
        'effective_from',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'effective_from' => 'date',
            'published_at' => 'datetime',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function phases(): HasMany
    {
        return $this->hasMany(CurriculumPhase::class)
            ->orderBy('sort_order');
    }

    public function enrollments()
{
    return $this->hasMany(Enrollment::class);
}
}