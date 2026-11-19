<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();

            $table->string('enrollment_number')->unique();

            $table->foreignId('trainee_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('curriculum_version_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('assigned_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('status')->default('enrolled');

            $table->timestamp('enrolled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->text('remarks')->nullable();

            $table->timestamps();

            $table->index(['trainee_id', 'status']);
            $table->index(['curriculum_version_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};