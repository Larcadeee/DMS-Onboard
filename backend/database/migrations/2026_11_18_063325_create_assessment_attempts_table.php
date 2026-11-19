<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_attempts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('assessment_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('enrollment_id')
                ->constrained()
                ->restrictOnDelete();

            $table->unsignedInteger('attempt_number');

            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->decimal('score', 8, 2)->nullable();

            $table->string('status')->default('in_progress');

            $table->foreignId('evaluated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('feedback')->nullable();

            $table->timestamps();

            $table->unique([
                'assessment_id',
                'enrollment_id',
                'attempt_number'
            ]);

            $table->index(['enrollment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_attempts');
    }
};