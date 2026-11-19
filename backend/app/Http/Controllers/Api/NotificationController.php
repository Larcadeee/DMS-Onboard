<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function index()
    {
        $notifications = Notification::where('user_id', request()->user()->id)
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => Notification::where('user_id', request()->user()->id)->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Notification $notification)
    {
        abort_unless($notification->user_id === request()->user()->id, 403);

        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead()
    {
        Notification::where('user_id', request()->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
