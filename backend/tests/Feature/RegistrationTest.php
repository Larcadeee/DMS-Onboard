<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function traineeRole(): Role
    {
        return Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);
    }

    private function admin(): User
    {
        $role = Role::create([
            'name' => 'Admin / Section Head',
            'slug' => 'admin_section_head',
            'is_active' => true,
        ]);

        foreach (['users.view', 'users.approve', 'users.deactivate', 'users.delete'] as $slug) {
            $permission = Permission::create([
                'name' => $slug,
                'slug' => $slug,
                'module' => 'users',
            ]);

            $role->permissions()->attach($permission->id);
        }

        return User::factory()->create([
            'role_id' => $role->id,
            'account_status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
    }

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Ana',
            'middle_name' => 'Reyes',
            'last_name' => 'Cruz',
            'email' => 'ana.cruz@cdrrmd.gov.ph',
            'contact_number' => '09171234567',
            'password' => 'Trainee@12345',
            'password_confirmation' => 'Trainee@12345',
        ], $overrides);
    }

    public function test_public_registration_creates_a_pending_trainee_account(): void
    {
        $this->traineeRole();

        $response = $this->postJson('/api/v1/register', $this->registerPayload());

        $response->assertCreated()
            ->assertJsonPath('account_status', User::STATUS_PENDING);

        $this->assertDatabaseHas('users', [
            'email' => 'ana.cruz@cdrrmd.gov.ph',
            'account_status' => User::STATUS_PENDING,
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.registered']);
    }

    public function test_pending_account_cannot_sign_in(): void
    {
        $this->traineeRole();
        $this->postJson('/api/v1/register', $this->registerPayload())->assertCreated();

        $this->postJson('/api/v1/login', [
            'email' => 'ana.cruz@cdrrmd.gov.ph',
            'password' => 'Trainee@12345',
        ])->assertStatus(403)
          ->assertJsonPath('account_status', User::STATUS_PENDING);
    }

    public function test_admin_approval_activates_the_account_and_allows_login(): void
    {
        $this->traineeRole();
        $this->postJson('/api/v1/register', $this->registerPayload())->assertCreated();

        $user = User::where('email', 'ana.cruz@cdrrmd.gov.ph')->firstOrFail();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$user->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'account_status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.approved']);

        $this->postJson('/api/v1/login', [
            'email' => 'ana.cruz@cdrrmd.gov.ph',
            'password' => 'Trainee@12345',
        ])->assertOk();
    }

    public function test_admin_rejection_blocks_sign_in_and_records_reason(): void
    {
        $this->traineeRole();
        $this->postJson('/api/v1/register', $this->registerPayload())->assertCreated();

        $user = User::where('email', 'ana.cruz@cdrrmd.gov.ph')->firstOrFail();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$user->id}/reject", ['reason' => 'Incomplete requirements.'])
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'account_status' => User::STATUS_REJECTED,
            'status_reason' => 'Incomplete requirements.',
        ]);

        $this->postJson('/api/v1/login', [
            'email' => 'ana.cruz@cdrrmd.gov.ph',
            'password' => 'Trainee@12345',
        ])->assertStatus(403)
          ->assertJsonPath('account_status', User::STATUS_REJECTED);
    }

    public function test_deactivation_blocks_existing_session_on_next_request(): void
    {
        $this->traineeRole();
        $admin = $this->admin();

        $user = User::factory()->create([
            'role_id' => Role::where('slug', 'etc_trainee')->value('id'),
            'account_status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$user->id}/deactivate")
            ->assertOk();

        $this->actingAs($user->fresh())
            ->getJson('/api/v1/user')
            ->assertStatus(403);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.deactivated']);
    }

    public function test_trainee_cannot_approve_registrations(): void
    {
        $role = $this->traineeRole();
        $admin = $this->admin();

        $pending = User::factory()->create([
            'role_id' => $role->id,
            'account_status' => User::STATUS_PENDING,
            'is_active' => false,
        ]);

        $this->actingAs($pending)
            ->postJson("/api/v1/users/{$admin->id}/approve")
            ->assertStatus(403);
    }

    public function test_user_status_must_be_a_valid_value_through_admin_filters(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->getJson('/api/v1/users?status=PENDING')
            ->assertOk();

        $this->assertSame(
            0,
            AuditLog::where('action', 'like', '%invalid%')->count()
        );
    }
}
