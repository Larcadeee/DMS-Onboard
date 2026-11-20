<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_status', 20)->default('ACTIVE')->after('is_active');
            $table->text('status_reason')->nullable()->after('account_status');
            $table->unsignedBigInteger('approved_by')->nullable()->after('status_reason');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->string('google_id', 255)->nullable()->unique()->after('approved_at');

            $table->index('account_status');
        });

        // Keep historical accounts consistent with the new status column.
        DB::table('users')->where('is_active', true)->update(['account_status' => 'ACTIVE']);
        DB::table('users')->where('is_active', false)->update(['account_status' => 'INACTIVE']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropIndex(['account_status']);
            $table->dropColumn([
                'account_status',
                'status_reason',
                'approved_by',
                'approved_at',
                'google_id',
            ]);
        });
    }
};
