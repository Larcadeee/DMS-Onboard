<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user:id,name,email')
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn ($inner) => $inner->where('action', 'ilike', "%{$s}%")
                    ->orWhere('description', 'ilike', "%{$s}%")
                    ->orWhere('subject_type', 'ilike', "%{$s}%"));
            })
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->user_id))
            ->when($request->filled('module'), fn ($q) => $q->where('subject_type', $request->module))
            ->when($request->filled('action'), function ($q) use ($request) {
                $q->where('action', 'like', $request->action . '%');
            })
            ->when($request->filled('date_from'), function ($q) use ($request) {
                $q->whereDate('created_at', '>=', $request->date_from);
            })
            ->when($request->filled('date_to'), function ($q) use ($request) {
                $q->whereDate('created_at', '<=', $request->date_to);
            });

        return $query->orderByDesc('created_at')->paginate(50);
    }
}