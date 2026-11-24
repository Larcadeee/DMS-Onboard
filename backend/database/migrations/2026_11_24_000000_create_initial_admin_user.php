<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Create the first administrator from ADMIN_EMAIL, ADMIN_NAME and
     * ADMIN_PASSWORD. Does nothing when ADMIN_EMAIL or ADMIN_PASSWORD is unset.
     */
    public function up(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (!$email || !$password) {
            return;
        }

        (new RolePermissionSeeder())->run();

        $role = Role::where('slug', 'admin_section_head')->firstOrFail();

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME') ?: 'Administrator',
                'password' => Hash::make($password),
                'role_id' => $role->id,
                'is_active' => true,
                'account_status' => User::STATUS_ACTIVE,
                'must_change_password' => true,
            ]
        );
    }

    public function down(): void
    {
        // Intentionally empty: never delete an administrator on rollback.
    }
};
