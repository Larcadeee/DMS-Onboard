<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public function record(
        Request $request,
        string $action,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?string $description = null,
        array $properties = []
    ): void {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}