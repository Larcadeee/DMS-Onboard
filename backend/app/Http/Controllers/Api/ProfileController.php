<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\UploadedFile;

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
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
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
                $oldPath = $user->profile_photo_path;
                $newPath = $this->storeProcessedPhoto($user, $request->file('profile_photo'));
                $user->profile_photo_path = $newPath;
                if ($oldPath && $oldPath !== $newPath) {
                    Storage::disk('local')->delete($oldPath);
                }
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
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $oldPath = $user->profile_photo_path;
        $newPath = $this->storeProcessedPhoto($user, $request->file('profile_photo'));
        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('local')->delete($oldPath);
        }
        $user->forceFill(['profile_photo_path' => $newPath])->save();

        $audit->record($request, 'user.photo_updated', 'User', $user->id, 'User profile photo updated by administrator.');

        return response()->json([
            'message' => 'Profile photo updated.',
            'user' => $user->fresh(),
        ]);
    }

    public function destroyUserPhoto(Request $request, User $user, AuditLogger $audit)
    {
        $this->deleteStoredPhoto($user);
        $user->forceFill(['profile_photo_path' => null])->save();

        $audit->record($request, 'user.photo_removed', 'User', $user->id, 'User profile photo removed by administrator.');

        return response()->json([
            'message' => 'Profile photo removed.',
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

    protected function storeProcessedPhoto(User $user, UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath());
        if ($info === false) {
            throw ValidationException::withMessages([
                'profile_photo' => 'The uploaded file is not a valid image.',
            ]);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        $detectedMime = $info['mime'] ?? $file->getMimeType();
        if (! in_array($detectedMime, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                'profile_photo' => 'The uploaded image must be JPG, JPEG, PNG, or WebP.',
            ]);
        }

        $contents = file_get_contents($file->getRealPath());
        if ($contents === false) {
            throw ValidationException::withMessages([
                'profile_photo' => 'The uploaded image could not be read.',
            ]);
        }

        $source = @imagecreatefromstring($contents);
        if ($source === false) {
            throw ValidationException::withMessages([
                'profile_photo' => 'The uploaded image could not be processed.',
            ]);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $longestSide = max($width, $height);
        $scale = $longestSide > 512 ? 512 / $longestSide : 1;
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($targetWidth, $targetHeight);

        if ($detectedMime === 'image/png') {
            imagealphablending($target, false);
            imagesavealpha($target, true);
        }

        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        if ($detectedMime === 'image/png') {
            imagepng($target, null, 8);
            $extension = 'png';
        } elseif ($detectedMime === 'image/webp' && function_exists('imagewebp')) {
            imagewebp($target, null, 82);
            $extension = 'webp';
        } else {
            imagejpeg($target, null, 82);
            $extension = 'jpg';
        }
        $processed = ob_get_clean();

        imagedestroy($target);
        imagedestroy($source);

        if (! is_string($processed) || $processed === '') {
            throw ValidationException::withMessages([
                'profile_photo' => 'The uploaded image could not be compressed.',
            ]);
        }

        $path = "profile-photos/{$user->id}/avatar-" . bin2hex(random_bytes(8)) . '.' . $extension;
        Storage::disk('local')->put($path, $processed);

        return $path;
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
