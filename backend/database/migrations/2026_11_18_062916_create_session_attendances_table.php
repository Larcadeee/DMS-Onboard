<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_attendances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_session_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('enrollment_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('attendance_status')->default('unmarked');

            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();

            $table->text('remarks')->nullable();

            $table->foreignId('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique([
                'training_session_id',
                'enrollment_id'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_attendances');
    }
};