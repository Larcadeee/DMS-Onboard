<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function user(array $attributes = []): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'trainer_evaluator'],
            ['name' => 'Trainer / Evaluator', 'is_active' => true]
        );

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'is_active' => true,
        ], $attributes));
    }

    public function test_user_can_view_and_update_own_profile(): void
    {
        $user = $this->user(['name' => 'Old Name']);

        $this->actingAs($user)
            ->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->actingAs($user)
            ->post('/api/v1/profile', [
                'first_name' => 'Jose',
                'middle_name' => 'Dela',
                'last_name' => 'Cruz',
                'email' => 'jose.updated@example.com',
                'contact_number' => '+63 917 555 1234',
                'role_id' => 999,
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Jose Dela Cruz')
            ->assertJsonPath('user.email', 'jose.updated@example.com');

        $user->refresh();

        $this->assertSame('Jose Dela Cruz', $user->name);
        $this->assertSame('+63 917 555 1234', $user->contact_number);
        $this->assertTrue($user->is_active);
        $this->assertNotSame(999, $user->role_id);
    }

    public function test_profile_update_validates_email_and_photo_format(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->post('/api/v1/profile', [
                'first_name' => 'Jose',
                'last_name' => 'Cruz',
                'email' => 'not-an-email',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->actingAs($user)
            ->post('/api/v1/profile', [
                'first_name' => 'Jose',
                'last_name' => 'Cruz',
                'email' => 'jose@example.com',
                'profile_photo' => UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profile_photo');
    }

    public function test_user_can_upload_replace_and_remove_own_photo(): void
    {
        Storage::fake('local');
        $user = $this->user();

        $this->actingAs($user)
            ->post('/api/v1/profile', [
                'first_name' => 'Jose',
                'last_name' => 'Cruz',
                'email' => $user->email,
                'profile_photo' => UploadedFile::fake()->image('avatar.png', 200, 200),
            ])
            ->assertOk()
            ->assertJsonPath('user.avatar_url', fn ($url) => str_contains($url, '/api/v1/users/'.$user->id.'/avatar'));

        $user->refresh();
        $this->assertNotNull($user->profile_photo_path);
        Storage::disk('local')->assertExists($user->profile_photo_path);

        $this->actingAs($user)
            ->get("/api/v1/users/{$user->id}/avatar")
            ->assertOk();

        $this->actingAs($user)
            ->deleteJson('/api/v1/profile/photo')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', null);

        $this->assertNull($user->fresh()->profile_photo_path);
    }

    public function test_user_without_permission_cannot_change_another_users_photo(): void
    {
        Storage::fake('local');
        $actor = $this->user();
        $target = $this->user();

        $this->actingAs($actor)
            ->post("/api/v1/users/{$target->id}/photo", [
                'profile_photo' => UploadedFile::fake()->image('avatar.jpg', 100, 100),
            ])
            ->assertForbidden();
    }
}
