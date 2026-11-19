<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainees', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->unique()
                ->constrained()
                ->restrictOnDelete();

            $table->string('trainee_number')->unique();

            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();

            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('address')->nullable();

            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_number')->nullable();

            $table->string('employment_status')->default('applicant');
            $table->string('trainee_status')->default('registered');

            $table->text('remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('trainee_status');
            $table->index('employment_status');
            $table->index(['last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainees');
    }
};