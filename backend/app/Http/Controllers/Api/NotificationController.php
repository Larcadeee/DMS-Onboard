<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->integer('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $user->notifications()->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
