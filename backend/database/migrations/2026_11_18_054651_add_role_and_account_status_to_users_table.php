
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')
                ->nullable()
                ->constrained('roles')
                ->restrictOnDelete();

            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(true);
            $table->timestamp('last_login_at')->nullable();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropIndex(['is_active']);
            $table->dropColumn([
                'role_id',
                'is_active',
                'must_change_password',
                'last_login_at',
            ]);
        });
    }
};
