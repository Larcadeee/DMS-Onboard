<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_roles_receive_only_their_own_paginated_notifications(): void
    {
        foreach ([
            'admin_section_head',
            'training_supervisor',
            'trainer_evaluator',
            'etc_trainee',
        ] as $slug) {
            $role = Role::create([
                'name' => $slug,
                'slug' => $slug,
                'is_active' => true,
            ]);
            $user = User::factory()->create([
                'role_id' => $role->id,
                'account_status' => User::STATUS_ACTIVE,
                'is_active' => true,
            ]);
            $otherUser = User::factory()->create([
                'account_status' => User::STATUS_ACTIVE,
                'is_active' => true,
            ]);

            Notification::create([
                'user_id' => $user->id,
                'title' => 'Newest notification',
                'message' => 'Visible to its recipient only.',
                'type' => 'info',
            ]);
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Older notification',
                'message' => 'Visible to its recipient only.',
                'type' => 'info',
            ]);
            Notification::create([
                'user_id' => $otherUser->id,
                'title' => 'Another user notification',
                'message' => 'Must not be returned.',
                'type' => 'info',
            ]);

            $this->actingAs($user)
                ->getJson('/api/v1/notifications?per_page=1')
                ->assertOk()
                ->assertJsonPath('notifications.per_page', 1)
                ->assertJsonPath('notifications.total', 2)
                ->assertJsonPath('notifications.data.0.user_id', $user->id)
                ->assertJsonPath('unread_count', 2)
                ->assertJsonMissing(['title' => 'Another user notification']);
        }
    }

    public function test_a_user_cannot_mark_another_users_notification_as_read(): void
    {
        $role = Role::create([
            'name' => 'ETC / Trainee',
            'slug' => 'etc_trainee',
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'account_status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
        $otherUser = User::factory()->create([
            'account_status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
        $notification = Notification::create([
            'user_id' => $otherUser->id,
            'title' => 'Private notification',
            'message' => 'This belongs to another user.',
            'type' => 'info',
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertForbidden();

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'read_at' => null,
        ]);
    }
}
