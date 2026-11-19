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
            $table->string('first_name', 100)->nullable()->after('name');
            $table->string('middle_name', 100)->nullable()->after('first_name');
            $table->string('last_name', 100)->nullable()->after('middle_name');
            $table->string('contact_number', 50)->nullable()->after('email');
            $table->string('profile_photo_path')->nullable()->after('contact_number');
        });

        // Preserve existing display names by splitting them into name parts.
        DB::table('users')->orderBy('id')->each(function (object $user): void {
            $parts = preg_split('/\s+/', trim((string) $user->name)) ?: [];
            $first = array_shift($parts);
            $last = count($parts) ? array_pop($parts) : null;
            $middle = count($parts) ? implode(' ', $parts) : null;

            DB::table('users')->where('id', $user->id)->update([
                'first_name' => $first ?: $user->name,
                'middle_name' => $middle,
                'last_name' => $last,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'middle_name',
                'last_name',
                'contact_number',
                'profile_photo_path',
            ]);
        });
    }
};
