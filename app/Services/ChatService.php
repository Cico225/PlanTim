<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChatService
{
    /**
     * Create a new conversation
     */
    public static function createConversation(string $type, ?string $name, array $participantIds, ?int $projectId = null, int $createdBy = null): ?int
    {
        try {
            // Create conversation
            $conversationId = DB::table('chat_conversations')->insertGetId([
                'type' => $type,
                'name' => $name,
                'project_id' => $projectId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Add participants
            $participants = [];
            foreach ($participantIds as $userId) {
                $participants[] = [
                    'conversation_id' => $conversationId,
                    'user_id' => $userId,
                    'joined_at' => now(),
                ];
            }

            DB::table('chat_participants')->insert($participants);

            // Send welcome message for group/project conversations
            if ($type !== 'private' && $createdBy) {
                self::sendSystemMessage($conversationId, 'Conversation created', $createdBy);
            }

            return $conversationId;
        } catch (\Exception $e) {
            Log::error('Failed to create conversation: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send a message to conversation
     */
    public static function sendMessage(int $conversationId, int $userId, string $message, string $type = 'text', ?string $fileUrl = null, ?string $fileName = null): ?int
    {
        try {
            $messageId = DB::table('chat_messages')->insertGetId([
                'conversation_id' => $conversationId,
                'user_id' => $userId,
                'message' => $message,
                'type' => $type,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // If there are file attachments, save them separately
            if ($fileUrl && $fileName) {
                DB::table('chat_message_attachments')->insert([
                    'message_id' => $messageId,
                    'file_name' => $fileName,
                    'file_path' => $fileUrl,
                    'file_size' => 0, // Default value, should be passed as parameter
                    'mime_type' => 'application/octet-stream', // Default value
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Update conversation timestamp
            DB::table('chat_conversations')
                ->where('id', $conversationId)
                ->update(['updated_at' => now()]);

            // Send notifications to other participants
            self::notifyParticipants($conversationId, $userId, $message);

            // TODO: Broadcast message via WebSocket/Pusher

            return $messageId;
        } catch (\Exception $e) {
            Log::error('Failed to send message: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send system message
     */
    public static function sendSystemMessage(int $conversationId, string $message, ?int $userId = null): ?int
    {
        return self::sendMessage($conversationId, $userId ?? 1, $message, 'system');
    }

    /**
     * Add participant to conversation
     */
    public static function addParticipant(int $conversationId, int $userId, int $addedBy): bool
    {
        try {
            // Check if already participant
            $exists = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $userId)
                ->exists();

            if ($exists) {
                return false;
            }

            // Add participant
            DB::table('chat_participants')->insert([
                'conversation_id' => $conversationId,
                'user_id' => $userId,
                'joined_at' => now(),
            ]);

            // Send system message
            $userName = DB::table('users')->where('id', $userId)->value('name');
            $adderName = DB::table('users')->where('id', $addedBy)->value('name');
            
            self::sendSystemMessage($conversationId, "{$adderName} added {$userName} to the conversation", $addedBy);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to add participant: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Remove participant from conversation
     */
    public static function removeParticipant(int $conversationId, int $userId, int $removedBy): bool
    {
        try {
            // Remove participant
            DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $userId)
                ->delete();

            // Send system message
            $userName = DB::table('users')->where('id', $userId)->value('name');
            $removerName = DB::table('users')->where('id', $removedBy)->value('name');
            
            if ($userId === $removedBy) {
                self::sendSystemMessage($conversationId, "{$userName} left the conversation", $removedBy);
            } else {
                self::sendSystemMessage($conversationId, "{$removerName} removed {$userName} from the conversation", $removedBy);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to remove participant: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Mark messages as read for user
     */
    public static function markAsRead(int $conversationId, int $userId): bool
    {
        try {
            // Update last_read_at in chat_participants table
            DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $userId)
                ->update(['last_read_at' => now()]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to mark messages as read: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get unread message count for user
     */
    public static function getUnreadCount(int $userId): int
    {
        // Count messages after user's last_read_at for each conversation
        $conversations = DB::table('chat_participants')
            ->where('user_id', $userId)
            ->get(['conversation_id', 'last_read_at']);
        
        $totalUnread = 0;
        foreach ($conversations as $participant) {
            $unreadInConversation = DB::table('chat_messages')
                ->where('conversation_id', $participant->conversation_id)
                ->where('user_id', '!=', $userId)
                ->when($participant->last_read_at, function($query, $lastReadAt) {
                    return $query->where('created_at', '>', $lastReadAt);
                })
                ->count();
            
            $totalUnread += $unreadInConversation;
        }
        
        return $totalUnread;
    }

    /**
     * Create project conversation automatically
     */
    public static function createProjectConversation(int $projectId, string $projectName, array $memberIds): ?int
    {
        return self::createConversation(
            'project',
            "Project: {$projectName}",
            $memberIds,
            $projectId
        );
    }

    /**
     * Get or create private conversation between two users
     */
    public static function getOrCreatePrivateConversation(int $user1Id, int $user2Id): ?int
    {
        // Check if conversation already exists
        $conversationId = DB::table('chat_conversations')
            ->select('chat_conversations.id')
            ->join('chat_participants as p1', 'chat_conversations.id', '=', 'p1.conversation_id')
            ->join('chat_participants as p2', 'chat_conversations.id', '=', 'p2.conversation_id')
            ->where('chat_conversations.type', 'private')
            ->where('p1.user_id', $user1Id)
            ->where('p2.user_id', $user2Id)
            ->whereRaw('(SELECT COUNT(*) FROM chat_participants WHERE conversation_id = chat_conversations.id) = 2')
            ->value('chat_conversations.id');

        if ($conversationId) {
            return $conversationId;
        }

        // Create new private conversation
        return self::createConversation('private', null, [$user1Id, $user2Id]);
    }

    /**
     * Search messages
     */
    public static function searchMessages(int $userId, string $query, ?int $conversationId = null): array
    {
        $queryBuilder = DB::table('chat_messages')
            ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar', 'chat_conversations.name as conversation_name')
            ->join('users', 'chat_messages.user_id', '=', 'users.id')
            ->join('chat_conversations', 'chat_messages.conversation_id', '=', 'chat_conversations.id')
            ->join('chat_participants', 'chat_conversations.id', '=', 'chat_participants.conversation_id')
            ->where('chat_participants.user_id', $userId)
            ->where('chat_messages.message', 'LIKE', '%' . $query . '%');

        if ($conversationId) {
            $queryBuilder->where('chat_messages.conversation_id', $conversationId);
        }

        return $queryBuilder->orderBy('chat_messages.created_at', 'desc')
            ->limit(50)
            ->get()
            ->toArray();
    }

    /**
     * Notify participants about new message
     */
    private static function notifyParticipants(int $conversationId, int $senderId, string $message): void
    {
        try {
            // Get participants (excluding sender)
            $participants = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', '!=', $senderId)
                ->pluck('user_id')
                ->toArray();

            if (empty($participants)) {
                return;
            }

            // Get sender name
            $senderName = DB::table('users')->where('id', $senderId)->value('name');
            
            // Create preview of message (first 50 characters)
            $messagePreview = strlen($message) > 50 ? substr($message, 0, 50) . '...' : $message;

            // Send notifications to participants
            foreach ($participants as $participantId) {
                // Check if user has chat notifications enabled
                if (NotificationService::isNotificationEnabled($participantId, 'chat_messages')) {
                    NotificationService::chatMessage($participantId, $conversationId, $senderName, $messagePreview);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to notify participants: ' . $e->getMessage());
        }
    }

    /**
     * Delete conversation
     */
    public static function deleteConversation(int $conversationId): bool
    {
        try {
            // Delete messages
            DB::table('chat_messages')->where('conversation_id', $conversationId)->delete();
            
            // Delete participants
            DB::table('chat_participants')->where('conversation_id', $conversationId)->delete();
            
            // Delete conversation
            DB::table('chat_conversations')->where('id', $conversationId)->delete();

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to delete conversation: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get conversation statistics
     */
    public static function getConversationStats(int $conversationId): array
    {
        $stats = [
            'total_messages' => DB::table('chat_messages')->where('conversation_id', $conversationId)->count(),
            'total_participants' => DB::table('chat_participants')->where('conversation_id', $conversationId)->count(),
            'files_shared' => DB::table('chat_messages')->where('conversation_id', $conversationId)->where('type', 'file')->count(),
            'images_shared' => DB::table('chat_messages')->where('conversation_id', $conversationId)->where('type', 'image')->count(),
        ];

        // Most active participant
        $mostActive = DB::table('chat_messages')
            ->select('user_id', DB::raw('COUNT(*) as message_count'), 'users.name')
            ->join('users', 'chat_messages.user_id', '=', 'users.id')
            ->where('conversation_id', $conversationId)
            ->groupBy('user_id', 'users.name')
            ->orderBy('message_count', 'desc')
            ->first();

        $stats['most_active_user'] = $mostActive;

        return $stats;
    }
}
