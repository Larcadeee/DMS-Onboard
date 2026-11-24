<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_user_cannot_access_protected_routes(): void
    {
        $role = Role::create([
            'name' => 'Admin / Section Head',
            'slug' => 'admin_section_head',
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => false,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/user')
            ->assertStatus(403);
    }

    public function test_active_user_can_retrieve_own_profile(): void
    {
        $role = Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_user_who_must_change_password_cannot_access_other_protected_routes(): void
    {
        $role = Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/profile')
            ->assertForbidden()
            ->assertJsonPath('must_change_password', true);
    }

    public function test_user_who_must_change_password_can_view_user_and_change_password(): void
    {
        $role = Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('user.must_change_password', true);

        $this->postJson('/api/v1/change-password', [
            'current_password' => 'password',
            'password' => 'StrongerPassword123',
            'password_confirmation' => 'StrongerPassword123',
        ])->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);

        $this->getJson('/api/v1/profile')->assertOk();
    }

    public function test_user_who_must_change_password_can_log_out(): void
    {
        $role = Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->actingAs($user)
            ->postJson('/api/v1/logout')
            ->assertOk();
    }
}
