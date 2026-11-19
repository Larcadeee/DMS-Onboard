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
}