<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with('role')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(25);
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
                'is_active' => true,
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

        if ($user->id === $request->user()->id &&
            isset($data['is_active']) && !$data['is_active']) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 422);
        }

        DB::transaction(function () use ($user, $data, $request, $audit) {
            $user->update($data);

            if (array_intersect(['first_name', 'middle_name', 'last_name'], array_keys($data))) {
                $user->forceFill(['name' => $user->displayName()])->save();
            }

            if (array_key_exists('is_active', $data) && !$data['is_active']) {
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
}