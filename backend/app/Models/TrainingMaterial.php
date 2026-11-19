<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingMaterial extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'program_id', 'curriculum_phase_id', 'training_module_id', 'title',
        'description', 'document_type', 'file_path', 'original_filename',
        'mime_type', 'file_size', 'version', 'status', 'uploaded_by',
    ];

    public function program(): BelongsTo { return $this->belongsTo(Program::class); }
    public function phase(): BelongsTo { return $this->belongsTo(CurriculumPhase::class, 'curriculum_phase_id'); }
    public function module(): BelongsTo { return $this->belongsTo(TrainingModule::class, 'training_module_id'); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
