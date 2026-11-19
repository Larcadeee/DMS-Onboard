<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_responses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('assessment_attempt_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('assessment_question_id')
                ->constrained()
                ->restrictOnDelete();

            $table->jsonb('answer')->nullable();

            $table->decimal('awarded_points', 8, 2)->nullable();

            $table->foreignId('evaluated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('evaluator_feedback')->nullable();

            $table->timestamps();

            $table->unique([
                'assessment_attempt_id',
                'assessment_question_id'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_responses');
    }
};