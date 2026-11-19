<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_competencies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_module_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();

            $table->jsonb('performance_criteria')->nullable();

            $table->boolean('is_required')->default(true);
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['training_module_id', 'is_required']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_competencies');
    }
};