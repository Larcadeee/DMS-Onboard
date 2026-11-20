<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with(['role:id,name,slug', 'approver:id,name'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('first_name', 'ilike', "%{$search}%")
                      ->orWhere('last_name', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('account_status', strtoupper($request->status)))
            ->when($request->filled('role_id'), fn ($q) => $q->where('role_id', $request->role_id))
            ->orderByRaw("case account_status when 'PENDING' then 0 else 1 end")
            ->orderBy('name')
            ->paginate((int) $request->integer('per_page', 25));
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role_id' => ['required', 'exists:roles,id'],
            'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()->mixedCase()],
        ]);

        $user = DB::transaction(function () use ($data, $request, $audit) {
            $user = User::create([
                'name' => $data['name'],
                'first_name' => $data['first_name'] ?? null,
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'contact_number' => $data['contact_number'] ?? null,
                'email' => $data['email'],
                'role_id' => $data['role_id'],
                'password' => Hash::make($data['password']),
                'account_status' => User::STATUS_ACTIVE,
                'is_active' => true,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'must_change_password' => true,
            ]);

            $audit->record(
                $request,
                'user.created',
                'User',
                $user->id,
                'New user account created.'
            );

            return $user;
        });

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user->load('role'),
        ], 201);
    }

    public function update(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'contact_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $isSelf = $user->id === $request->user()->id;

        if ($isSelf && array_key_exists('is_active', $data) && !$data['is_active']) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 422);
        }

        if ($isSelf && array_key_exists('role_id', $data) && (int) $data['role_id'] !== (int) $user->role_id) {
            return response()->json([
                'message' => 'You cannot change your own role.',
            ], 422);
        }

        $deactivating = array_key_exists('is_active', $data) && !$data['is_active'];
        $roleChange = array_key_exists('role_id', $data) && (int) $data['role_id'] !== (int) $user->role_id;

        if (($deactivating || $roleChange) && $user->role?->slug === 'admin_section_head' && !$this->hasAnotherActiveAdmin($user->id)) {
            return response()->json([
                'message' => 'At least one active Administrator account must remain.',
            ], 422);
        }

        DB::transaction(function () use ($user, $data, $request, $audit, $deactivating) {
            $user->update($data);

            if (array_intersect(['first_name', 'middle_name', 'last_name'], array_keys($data))) {
                $user->forceFill(['name' => $user->displayName()])->save();
            }

            if ($deactivating) {
                $user->forceFill([
                    'account_status' => User::STATUS_INACTIVE,
                    'remember_token' => null,
                ])->save();

                $user->tokens()->delete();
            }

            $audit->record(
                $request,
                'user.updated',
                'User',
                $user->id,
                'User account details updated.',
                ['changed_fields' => array_keys($data)]
            );
        });

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function approve(Request $request, User $user, AuditLogger $audit)
    {
        if ($user->isActiveStatus()) {
            return response()->json(['message' => 'This account is already active.'], 422);
        }

        DB::transaction(function () use ($user, $request, $audit) {
            $user->forceFill([
                'account_status' => User::STATUS_ACTIVE,
                'is_active' => true,
                'status_reason' => null,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ])->save();

            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account approved',
                'message' => 'Your account has been approved. You may now sign in to the onboarding system.',
                'type' => 'account',
                'link' => '/login',
            ]);

            $audit->record($request, 'user.approved', 'User', $user->id, 'Registration approved.', [
                'email' => $user->email,
            ]);
        });

        return response()->json([
            'message' => 'Account approved successfully.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function reject(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot reject your own account.'], 422);
        }

        if ($user->role?->slug === 'admin_section_head' && !$this->hasAnotherActiveAdmin($user->id)) {
            return response()->json(['message' => 'At least one active Administrator account must remain.'], 422);
        }

        DB::transaction(function () use ($user, $data, $request, $audit) {
            $user->forceFill([
                'account_status' => User::STATUS_REJECTED,
                'is_active' => false,
                'status_reason' => $data['reason'] ?? null,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'remember_token' => null,
            ])->save();

            $user->tokens()->delete();

            $audit->record($request, 'user.rejected', 'User', $user->id, 'Registration rejected.', [
                'reason' => $data['reason'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Registration rejected.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function activate(Request $request, User $user, AuditLogger $audit)
    {
        if ($user->isActiveStatus()) {
            return response()->json(['message' => 'This account is already active.'], 422);
        }

        DB::transaction(function () use ($user, $request, $audit) {
            $user->forceFill([
                'account_status' => User::STATUS_ACTIVE,
                'is_active' => true,
                'status_reason' => null,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ])->save();

            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account activated',
                'message' => 'Your account has been activated. You may now sign in to the onboarding system.',
                'type' => 'account',
                'link' => '/login',
            ]);

            $audit->record($request, 'user.activated', 'User', $user->id, 'User account activated.');
        });

        return response()->json([
            'message' => 'Account activated successfully.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function deactivate(Request $request, User $user, AuditLogger $audit)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        if (!$user->isActiveStatus()) {
            return response()->json(['message' => 'This account is not active.'], 422);
        }

        if ($user->role?->slug === 'admin_section_head' && !$this->hasAnotherActiveAdmin($user->id)) {
            return response()->json(['message' => 'At least one active Administrator account must remain.'], 422);
        }

        DB::transaction(function () use ($user, $request, $audit) {
            $user->forceFill([
                'account_status' => User::STATUS_INACTIVE,
                'is_active' => false,
                'remember_token' => null,
            ])->save();

            $user->tokens()->delete();

            $audit->record($request, 'user.deactivated', 'User', $user->id, 'User account deactivated.');
        });

        return response()->json([
            'message' => 'Account deactivated. Active sessions will be signed out on their next request.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    public function destroy(Request $request, User $user, AuditLogger $audit)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->trainee()->exists()) {
            return response()->json([
                'message' => 'This user has a trainee record. Archive the trainee instead of deleting the account.',
            ], 422);
        }

        if ($user->isActiveStatus() && $user->role?->slug === 'admin_section_head' && !$this->hasAnotherActiveAdmin($user->id)) {
            return response()->json(['message' => 'At least one active Administrator account must remain.'], 422);
        }

        DB::transaction(function () use ($user, $request, $audit) {
            $audit->record($request, 'user.deleted', 'User', $user->id, 'User account deleted.', [
                'email' => $user->email,
            ]);

            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json(['message' => 'User account deleted.']);
    }

    public function resetPassword(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate([
            'password' => [
                'required',
                'confirmed',
                Password::min(12)->letters()->numbers()->mixedCase(),
            ],
        ]);

        DB::transaction(function () use ($user, $data, $request, $audit) {
            $user->update([
                'password' => Hash::make($data['password']),
                'must_change_password' => true,
            ]);

            $user->tokens()->delete();

            $audit->record(
                $request,
                'user.password_reset',
                'User',
                $user->id,
                'Administrator initiated a password reset.'
            );
        });

        return response()->json([
            'message' => 'Password reset successfully. User must change the password upon next login.',
        ]);
    }

    private function hasAnotherActiveAdmin(int $exceptUserId): bool
    {
        return User::where('account_status', User::STATUS_ACTIVE)
            ->where('id', '!=', $exceptUserId)
            ->whereHas('role', fn ($query) => $query->where('slug', 'admin_section_head'))
            ->exists();
    }
}
