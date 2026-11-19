<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_modules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('curriculum_phase_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('code')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->jsonb('learning_objectives')->nullable();

            $table->unsignedInteger('estimated_minutes')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->boolean('is_required')->default(true);
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['curriculum_phase_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_modules');
    }
};