<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_module_id')
                ->nullable()
                ->constrained()
                ->restrictOnDelete();

            $table->string('title');
            $table->text('instructions')->nullable();

            $table->string('assessment_type')->default('written');

            $table->decimal('total_points', 8, 2)->default(0);
            $table->decimal('passing_score', 8, 2)->nullable();

            $table->unsignedInteger('time_limit_minutes')->nullable();
            $table->unsignedInteger('attempts_allowed')->default(1);

            $table->boolean('is_published')->default(false);

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['training_module_id', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};