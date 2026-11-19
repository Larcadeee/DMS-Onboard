<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->text('objectives')->nullable();
            $table->text('target_participants')->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('assigned_trainer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('current_phase_id')->nullable()->constrained('curriculum_phases')->nullOnDelete();
            $table->foreignId('final_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_for_review_at')->nullable();
            $table->timestamp('final_approved_at')->nullable();
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('release_results')->default(false);
            $table->timestamp('available_from')->nullable();
            $table->timestamp('available_to')->nullable();
        });

        Schema::table('module_competencies', function (Blueprint $table) {
            $table->string('category')->nullable();
            $table->text('expected_performance')->nullable();
            $table->text('evaluation_criteria')->nullable();
        });

        Schema::table('competency_evaluations', function (Blueprint $table) {
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->text('strengths')->nullable();
            $table->text('improvement_plan')->nullable();
        });

        Schema::create('training_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('curriculum_phase_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('training_module_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('document_type')->default('document');
            $table->string('file_path')->nullable();
            $table->string('original_filename')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->string('status')->default('draft');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['program_id', 'status']);
            $table->index('training_module_id');
        });

        Schema::create('module_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_module_id')->constrained()->cascadeOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->unique(['enrollment_id', 'training_module_id']);
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group')->default('general');
            $table->string('key')->unique();
            $table->jsonb('value')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('type')->default('info');
            $table->string('link')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('module_completions');
        Schema::dropIfExists('training_materials');

        Schema::table('competency_evaluations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('validated_by');
            $table->dropColumn(['validated_at', 'strengths', 'improvement_plan']);
        });

        Schema::table('module_competencies', function (Blueprint $table) {
            $table->dropColumn(['category', 'expected_performance', 'evaluation_criteria']);
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('evaluator_id');
            $table->dropColumn(['release_results', 'available_from', 'available_to']);
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_trainer_id');
            $table->dropConstrainedForeignId('assigned_supervisor_id');
            $table->dropConstrainedForeignId('current_phase_id');
            $table->dropConstrainedForeignId('final_approved_by');
            $table->dropColumn(['submitted_for_review_at', 'final_approved_at']);
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn(['objectives', 'target_participants', 'duration_days', 'start_date', 'end_date']);
        });
    }
};
