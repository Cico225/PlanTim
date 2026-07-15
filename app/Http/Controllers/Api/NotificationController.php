<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function index(Request $request)
    {
        \Log::info('🔔 Loading notifications for user', ['user_id' => $request->user()->id]);
        
        $query = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc');

        if ($request->has('is_read')) {
            $isRead = $request->input('is_read');
            \Log::info('🔔 Filtering by is_read', ['is_read' => $isRead]);
            $query->where('is_read', $isRead);
        }

        $notifications = $query->paginate(20);
        
        \Log::info('🔔 Notifications loaded', [
            'total' => $notifications->total(),
            'count' => $notifications->count(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
        ]);

        return response()->json($notifications);
    }

    /**
     * Get unread count (always returns 200 to avoid breaking the frontend)
     */
    public function unreadCount(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['count' => 0], 200);
            }

            if (!Schema::hasTable('notifications')) {
                return response()->json(['count' => 0], 200);
            }

            $query = DB::table('notifications')->where('user_id', $user->id);
            if (Schema::hasColumn('notifications', 'is_read')) {
                $query->where('is_read', false);
            } elseif (Schema::hasColumn('notifications', 'read_at')) {
                $query->whereNull('read_at');
            }
            $count = $query->count();

            return response()->json(['count' => $count], 200);
        } catch (\Throwable $e) {
            \Log::warning('Error in unreadCount', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id ?? null,
            ]);
            return response()->json(['count' => 0], 200);
        }
    }

    /**
     * Mark as read
     */
    public function markAsRead(Request $request, $id)
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all as read
     */
    public function markAllAsRead(Request $request)
    {
        DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, $id)
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    /**
     * Clear all read notifications
     */
    public function clearRead(Request $request)
    {
        DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', true)
            ->delete();

        return response()->json(['message' => 'Read notifications cleared']);
    }

    /**
     * Create notification
     */
    public function create(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'type' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'action_url' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $notificationId = DB::table('notifications')->insertGetId([
            'user_id' => $request->input('user_id'),
            'type' => $request->input('type'),
            'title' => $request->input('title'),
            'message' => $request->input('message'),
            'action_url' => $request->input('action_url'),
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $notification = DB::table('notifications')->find($notificationId);

        // TODO: Send real-time notification via WebSocket/Pusher
        // TODO: Send email notification if user has email notifications enabled

        return response()->json($notification, 201);
    }

    /**
     * Bulk create notifications
     */
    public function bulkCreate(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'type' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'action_url' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $notifications = [];
        foreach ($request->input('user_ids') as $userId) {
            $notifications[] = [
                'user_id' => $userId,
                'type' => $request->input('type'),
                'title' => $request->input('title'),
                'message' => $request->input('message'),
                'action_url' => $request->input('action_url'),
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('notifications')->insert($notifications);

        return response()->json(['message' => 'Notifications created successfully', 'count' => count($notifications)], 201);
    }

    /**
     * Get notification settings
     */
    public function getSettings(Request $request)
    {
        $settings = DB::table('notification_settings')
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$settings) {
            // Create default settings
            $settingsId = DB::table('notification_settings')->insertGetId([
                'user_id' => $request->user()->id,
                'email_enabled' => true,
                'desktop_enabled' => true,
                'sound_enabled' => true,
                'settings' => json_encode([
                    'chat_messages' => true,
                    'task_assignments' => true,
                    'project_updates' => true,
                    'document_shares' => true,
                    'system_announcements' => true,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $settings = DB::table('notification_settings')->find($settingsId);
        }

        // Decode JSON settings
        $settings->settings = json_decode($settings->settings, true);

        return response()->json($settings);
    }

    /**
     * Update notification settings
     */
    public function updateSettings(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email_enabled' => 'boolean',
            'desktop_enabled' => 'boolean',
            'sound_enabled' => 'boolean',
            'settings' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = [
            'updated_at' => now(),
        ];

        if ($request->has('email_enabled')) {
            $data['email_enabled'] = $request->input('email_enabled');
        }

        if ($request->has('desktop_enabled')) {
            $data['desktop_enabled'] = $request->input('desktop_enabled');
        }

        if ($request->has('sound_enabled')) {
            $data['sound_enabled'] = $request->input('sound_enabled');
        }

        if ($request->has('settings')) {
            $data['settings'] = json_encode($request->input('settings'));
        }

        DB::table('notification_settings')
            ->updateOrInsert(
                ['user_id' => $request->user()->id],
                $data + ['created_at' => now()]
            );

        return response()->json(['message' => 'Settings updated successfully']);
    }

    /**
     * Get notification statistics
     */
    public function getStats(Request $request)
    {
        $userId = $request->user()->id;

        $stats = [
            'total' => DB::table('notifications')->where('user_id', $userId)->count(),
            'unread' => DB::table('notifications')->where('user_id', $userId)->where('is_read', false)->count(),
            'today' => DB::table('notifications')->where('user_id', $userId)->whereDate('created_at', today())->count(),
            'this_week' => DB::table('notifications')->where('user_id', $userId)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
        ];

        // Get notifications by type
        $byType = DB::table('notifications')
            ->select('type', DB::raw('count(*) as count'))
            ->where('user_id', $userId)
            ->groupBy('type')
            ->get()
            ->pluck('count', 'type')
            ->toArray();

        $stats['by_type'] = $byType;

        return response()->json($stats);
    }

    /**
     * Send system notification to all users
     */
    public function sendSystemNotification(Request $request)
    {
        // Check if user has admin permissions
        if (!$request->user()->hasRole(['super-admin', 'admin'])) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'action_url' => 'nullable|string|max:500',
            'user_roles' => 'nullable|array',
            'user_roles.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get target users
        $query = DB::table('users')->where('is_active', true);

        if ($request->has('user_roles') && !empty($request->input('user_roles'))) {
            $query->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                  ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                  ->whereIn('roles.name', $request->input('user_roles'))
                  ->where('model_has_roles.model_type', 'App\\Models\\User');
        }

        $users = $query->select('users.id')->distinct()->get();

        $notifications = [];
        foreach ($users as $user) {
            $notifications[] = [
                'user_id' => $user->id,
                'type' => 'system_announcement',
                'title' => $request->input('title'),
                'message' => $request->input('message'),
                'action_url' => $request->input('action_url'),
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($notifications)) {
            DB::table('notifications')->insert($notifications);
        }

        return response()->json(['message' => 'System notification sent successfully', 'count' => count($notifications)], 201);
    }
}

