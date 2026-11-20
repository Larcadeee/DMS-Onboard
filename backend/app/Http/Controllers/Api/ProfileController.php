<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'user' => $this->present($request->user()),
        ]);
    }

    public function update(Request $request, AuditLogger $audit)
    {
        $user = $request->user();

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'string', 'max:50', 'regex:/^[0-9+()\\-\\s]*$/'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        DB::transaction(function () use ($request, $user, $data, $audit) {
            $user->fill([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'contact_number' => $data['contact_number'] ?? null,
            ]);
            $user->name = $user->displayName();

            if ($request->hasFile('profile_photo')) {
                $this->deleteStoredPhoto($user);
                $user->profile_photo_path = $request->file('profile_photo')
                    ->store("profile-photos/{$user->id}", 'local');
            }

            $user->save();

            // Keep the linked trainee identification record in sync.
            $user->trainee?->update([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'contact_number' => $data['contact_number'] ?? null,
            ]);

            $audit->record(
                $request,
                'profile.updated',
                'User',
                $user->id,
                'Profile information updated.',
                ['photo_updated' => $request->hasFile('profile_photo')]
            );
        });

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->present($user->fresh()),
        ]);
    }

    public function destroyPhoto(Request $request, AuditLogger $audit)
    {
        $user = $request->user();

        $this->deleteStoredPhoto($user);
        $user->forceFill(['profile_photo_path' => null])->save();

        $audit->record($request, 'profile.photo_removed', 'User', $user->id, 'Profile photo removed.');

        return response()->json([
            'message' => 'Profile photo removed.',
            'user' => $this->present($user->fresh()),
        ]);
    }

    public function updateUserPhoto(Request $request, User $user, AuditLogger $audit)
    {
        $request->validate([
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $this->deleteStoredPhoto($user);
        $user->forceFill([
            'profile_photo_path' => $request->file('profile_photo')->store("profile-photos/{$user->id}", 'local'),
        ])->save();

        $audit->record($request, 'user.photo_updated', 'User', $user->id, 'User profile photo updated by administrator.');

        return response()->json([
            'message' => 'Profile photo updated.',
            'user' => $user->fresh(),
        ]);
    }

    public function avatar(User $user)
    {
        abort_unless($user->profile_photo_path, 404);
        abort_unless(Storage::disk('local')->exists($user->profile_photo_path), 404);

        $disk = Storage::disk('local');

        return response($disk->get($user->profile_photo_path), 200, [
            'Content-Type' => $disk->mimeType($user->profile_photo_path) ?: 'application/octet-stream',
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    protected function deleteStoredPhoto(User $user): void
    {
        if ($user->profile_photo_path && str_starts_with($user->profile_photo_path, 'profile-photos/')) {
            Storage::disk('local')->delete($user->profile_photo_path);
        }
    }

    protected function present(User $user): array
    {
        $user->loadMissing('role.permissions');

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
            'account_status' => $user->account_status,
            'last_login_at' => $user->last_login_at,
        ];
    }
}
