<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'contact_number',
        'profile_photo_path',
        'password',
        'role_id',
        'is_active',
        'must_change_password',
        'last_login_at',
    ];

    protected $appends = [
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->profile_photo_path) {
            return null;
        }

        return '/api/v1/users/' . $this->id . '/avatar?v=' . ($this->updated_at?->timestamp ?? time());
    }

    public function displayName(): string
    {
        $name = trim(implode(' ', array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
        ])));

        return $name !== '' ? $name : $this->name;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function hasPermission(string $permission): bool
    {
        if (!$this->is_active || !$this->role) {
            return false;
        }

        return $this->role->permissions()
            ->where('slug', $permission)
            ->exists();
    }

    public function trainee()
{
    return $this->hasOne(Trainee::class);
}

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
}