<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Authenticate an administrator, supervisor, or trainee.
     */
    public function login(LoginRequest $request)
    {
        $credentials = $request->only('email', 'password');

        if (!Auth::guard('web')->attempt($credentials)) {
            return response()->json([
                'message' => 'The provided credentials do not match our records.',
            ], 422);
        }

        $request->session()->regenerate();

        $user = Auth::guard('web')->user();

        if (
            !$user->is_active ||
            !$user->role ||
            !$user->role->is_active
        ) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Your account is inactive or has no active role.',
            ], 403);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $this->presentUser($user),
        ]);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $this->presentUser($request->user()),
        ]);
    }

    protected function presentUser(\App\Models\User $user): array
    {
        $user->load('role.permissions');

        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'permissions' => $user->role?->permissions->pluck('slug')->values() ?? [],
            'trainee_id' => $user->trainee?->id,
            'must_change_password' => $user->must_change_password,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'unread_notifications' => \App\Models\Notification::where('user_id', $user->id)->whereNull('read_at')->count(),
        ];
    }

    /**
     * Log out the authenticated user.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $token = $user->currentAccessToken();

            if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $token->delete();
            }
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'password' => [
                'required',
                'confirmed',
                Password::min(12)->letters()->numbers()->mixedCase(),
            ],
        ]);

        $user = $request->user();

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ])->save();

        // Revoke any personal access tokens and rotate the session identifier
        // after a credential change. Other sessions are logged out by the
        // Sanctum AuthenticateSession middleware on their next request.
        $user->tokens()->delete();
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }
}