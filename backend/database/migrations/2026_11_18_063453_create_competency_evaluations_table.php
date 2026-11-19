<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competency_evaluations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('enrollment_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('module_competency_id')
                ->constrained()
                ->restrictOnDelete();

            $table->unsignedInteger('evaluation_number')->default(1);

            $table->foreignId('evaluator_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->unsignedTinyInteger('rating')->nullable();

            $table->string('status')->default('pending');

            $table->text('evidence')->nullable();
            $table->text('feedback')->nullable();

            $table->timestamp('evaluated_at')->nullable();

            $table->timestamps();

            $table->index(['enrollment_id', 'status']);
            $table->index(['module_competency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competency_evaluations');
    }
};