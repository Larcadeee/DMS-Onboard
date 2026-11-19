<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainee_documents', function (Blueprint $table) {
            $table->id();

            $table->foreignId('trainee_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('document_type');
            $table->string('original_filename');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();

            $table->foreignId('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['trainee_id', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainee_documents');
    }
};