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

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_REJECTED = 'REJECTED';
    public const STATUS_INACTIVE = 'INACTIVE';

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
        'account_status',
        'status_reason',
        'approved_by',
        'approved_at',
        'google_id',
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
            'account_status' => 'string',
            'approved_at' => 'datetime',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            if ($user->account_status === null) {
                $user->attributes['account_status'] = $user->is_active === false
                    ? self::STATUS_INACTIVE
                    : self::STATUS_ACTIVE;
                $user->attributes['is_active'] = $user->attributes['account_status'] === self::STATUS_ACTIVE;

                return;
            }

            if ($user->isDirty('account_status')) {
                $user->attributes['is_active'] = $user->account_status === self::STATUS_ACTIVE;

                return;
            }

            if ($user->isDirty('is_active')) {
                if (!$user->is_active && $user->account_status === self::STATUS_ACTIVE) {
                    $user->attributes['account_status'] = self::STATUS_INACTIVE;
                } elseif ($user->is_active && in_array($user->account_status, [
                    self::STATUS_INACTIVE,
                    self::STATUS_REJECTED,
                ], true)) {
                    $user->attributes['account_status'] = self::STATUS_ACTIVE;
                }
            }
        });
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

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
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

    public function isActiveStatus(): bool
    {
        return $this->account_status === self::STATUS_ACTIVE;
    }

    public function isPending(): bool
    {
        return $this->account_status === self::STATUS_PENDING;
    }

    public function isRejected(): bool
    {
        return $this->account_status === self::STATUS_REJECTED;
    }

    public function scopePendingApproval($query)
    {
        return $query->where('account_status', self::STATUS_PENDING);
    }

    public function scopeActive($query)
    {
        return $query->where('account_status', self::STATUS_ACTIVE);
    }

    public function statusMessage(): string
    {
        return match ($this->account_status) {
            self::STATUS_PENDING => 'Your registration is awaiting administrator approval.',
            self::STATUS_REJECTED => 'Your registration was rejected. Contact the system administrator for details.',
            self::STATUS_INACTIVE => 'Your account is inactive. Contact the system administrator.',
            default => 'Your account is not permitted to sign in.',
        };
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
