<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('assessment_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('question_type')->default('multiple_choice');
            $table->text('question_text');

            $table->jsonb('options')->nullable();

            // Never expose this field through trainee-facing endpoints.
            $table->jsonb('correct_answer')->nullable();

            $table->decimal('points', 8, 2)->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_required')->default(true);

            $table->timestamps();

            $table->index(['assessment_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};