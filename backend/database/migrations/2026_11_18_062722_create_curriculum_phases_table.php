<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_phases', function (Blueprint $table) {
            $table->id();

            $table->foreignId('curriculum_version_id')
                ->constrained()
                ->restrictOnDelete();

            $table->unsignedInteger('phase_number');
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->unique([
                'curriculum_version_id',
                'phase_number'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_phases');
    }
};