<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_versions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('program_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('version_number');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('effective_from')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();

            $table->timestamps();

            $table->unique(['program_id', 'version_number']);
            $table->index(['program_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_versions');
    }
};