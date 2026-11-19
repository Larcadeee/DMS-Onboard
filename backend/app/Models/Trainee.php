<?php

namespace App\Models;


use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trainee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'trainee_number',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'date_of_birth',
        'sex',
        'contact_number',
        'address',
        'emergency_contact_name',
        'emergency_contact_number',
        'employment_status',
        'trainee_status',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TraineeDocument::class);
    }

    public function enrollments()
{
    return $this->hasMany(Enrollment::class);
}
}