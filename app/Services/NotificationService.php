<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Create a notification for a single user
     */
    public static function create(int $userId, string $type, string $title, string $message, ?string $actionUrl = null): bool
    {
        try {
            DB::table('notifications')->insert([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $actionUrl,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // TODO: Send real-time notification via WebSocket/Pusher
            // TODO: Send email notification if user has email notifications enabled

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to create notification: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Create notifications for multiple users
     */
    public static function createBulk(array $userIds, string $type, string $title, string $message, ?string $actionUrl = null): bool
    {
        try {
            $notifications = [];
            foreach ($userIds as $userId) {
                $notifications[] = [
                    'user_id' => $userId,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'action_url' => $actionUrl,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to create bulk notifications: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Create task assignment notification
     */
    public static function taskAssigned(int $userId, int $taskId, string $taskTitle, int $assignedBy): bool
    {
        $assignerName = DB::table('users')->where('id', $assignedBy)->value('name');
        
        return self::create(
            $userId,
            'task_assignment',
            'New Task Assignment',
            "You have been assigned to task: {$taskTitle} by {$assignerName}",
            "/projects/tasks/{$taskId}"
        );
    }

    /**
     * Create project update notification
     */
    public static function projectUpdated(array $memberIds, int $projectId, string $projectName, string $updateType, int $updatedBy): bool
    {
        $updaterName = DB::table('users')->where('id', $updatedBy)->value('name');
        
        return self::createBulk(
            $memberIds,
            'project_update',
            'Project Updated',
            "{$updaterName} made changes to project: {$projectName}",
            "/projects/{$projectId}"
        );
    }

    /**
     * Create document share notification
     */
    public static function documentShared(int $userId, int $documentId, string $documentName, int $sharedBy): bool
    {
        $sharerName = DB::table('users')->where('id', $sharedBy)->value('name');
        
        return self::create(
            $userId,
            'document_share',
            'Document Shared',
            "{$sharerName} shared a document with you: {$documentName}",
            "/dms/documents/{$documentId}"
        );
    }

    /**
     * Create chat message notification
     */
    public static function chatMessage(int $userId, int $conversationId, string $senderName, string $messagePreview): bool
    {
        return self::create(
            $userId,
            'chat_message',
            'New Message',
            "{$senderName}: {$messagePreview}",
            "/chat?conversation={$conversationId}"
        );
    }

    /**
     * Create user mention notification
     */
    public static function userMentioned(int $userId, string $context, string $mentionedBy, ?string $actionUrl = null): bool
    {
        return self::create(
            $userId,
            'user_mention',
            'You were mentioned',
            "{$mentionedBy} mentioned you in {$context}",
            $actionUrl
        );
    }

    /**
     * Create deadline reminder notification
     */
    public static function deadlineReminder(int $userId, string $itemType, string $itemName, string $deadline, ?string $actionUrl = null): bool
    {
        return self::create(
            $userId,
            'deadline_reminder',
            'Deadline Reminder',
            "Reminder: {$itemType} '{$itemName}' is due on {$deadline}",
            $actionUrl
        );
    }

    /**
     * Create approval request notification
     */
    public static function approvalRequest(int $userId, string $requestType, string $requestTitle, int $requestedBy, ?string $actionUrl = null): bool
    {
        $requesterName = DB::table('users')->where('id', $requestedBy)->value('name');
        
        return self::create(
            $userId,
            'approval_request',
            'Approval Required',
            "{$requesterName} requests approval for {$requestType}: {$requestTitle}",
            $actionUrl
        );
    }

    /**
     * Create system announcement notification
     */
    public static function systemAnnouncement(array $userIds, string $title, string $message, ?string $actionUrl = null): bool
    {
        return self::createBulk(
            $userIds,
            'system_announcement',
            $title,
            $message,
            $actionUrl
        );
    }

    /**
     * Get unread notification count for user
     */
    public static function getUnreadCount(int $userId): int
    {
        return DB::table('notifications')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    /**
     * Mark notification as read
     */
    public static function markAsRead(int $notificationId, int $userId): bool
    {
        try {
            DB::table('notifications')
                ->where('id', $notificationId)
                ->where('user_id', $userId)
                ->update(['is_read' => true, 'updated_at' => now()]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to mark notification as read: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Mark all notifications as read for user
     */
    public static function markAllAsRead(int $userId): bool
    {
        try {
            DB::table('notifications')
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->update(['is_read' => true, 'updated_at' => now()]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to mark all notifications as read: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete old read notifications (cleanup)
     */
    public static function cleanupOldNotifications(int $daysOld = 30): int
    {
        return DB::table('notifications')
            ->where('is_read', true)
            ->where('created_at', '<', now()->subDays($daysOld))
            ->delete();
    }

    /**
     * Get notification settings for user
     */
    public static function getUserSettings(int $userId): array
    {
        $settings = DB::table('notification_settings')
            ->where('user_id', $userId)
            ->first();

        if (!$settings) {
            // Create default settings
            $defaultSettings = [
                'user_id' => $userId,
                'email_enabled' => true,
                'desktop_enabled' => true,
                'sound_enabled' => true,
                'settings' => json_encode([
                    'chat_messages' => true,
                    'task_assignments' => true,
                    'project_updates' => true,
                    'document_shares' => true,
                    'system_announcements' => true,
                    'user_mentions' => true,
                    'deadline_reminders' => true,
                    'approval_requests' => true,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table('notification_settings')->insert($defaultSettings);
            
            $settings = (object) $defaultSettings;
        }

        $settings->settings = json_decode($settings->settings, true);
        
        return (array) $settings;
    }

    /**
     * Check if user has notification type enabled
     */
    public static function isNotificationEnabled(int $userId, string $notificationType): bool
    {
        $settings = self::getUserSettings($userId);
        
        return $settings['settings'][$notificationType] ?? true;
    }
}
















