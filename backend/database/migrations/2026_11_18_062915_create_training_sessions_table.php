<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_module_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('title');
            $table->text('description')->nullable();

            $table->string('session_type')->default('classroom');
            $table->string('delivery_mode')->default('onsite');

            $table->timestamp('starts_at');
            $table->timestamp('ends_at');

            $table->string('location')->nullable();
            $table->unsignedInteger('capacity')->nullable();

            $table->string('status')->default('scheduled');

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['starts_at', 'status']);
            $table->index('training_module_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_sessions');
    }
};