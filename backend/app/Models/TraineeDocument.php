<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TraineeDocument extends Model
{
    protected $fillable = [
        'trainee_id',
        'document_type',
        'original_filename',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    public function trainee(): BelongsTo
    {
        return $this->belongsTo(Trainee::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}