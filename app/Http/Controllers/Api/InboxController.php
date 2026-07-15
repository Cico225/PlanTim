<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Services\PushNotificationService;

class InboxController extends Controller
{
    /**
     * Check if inbox tables exist
     */
    private function checkInboxTables(): bool
    {
        try {
            return Schema::hasTable('inbox_messages');
        } catch (\Exception $e) {
            Log::warning('Error checking inbox tables', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Check if user can send messages
     */
    private function canUserSend(int $userId): bool
    {
        // Check if inbox_senders table exists
        if (!Schema::hasTable('inbox_senders')) {
            // If table doesn't exist, check by role (admin, manager can send)
            $user = User::find($userId);
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    return $user->hasAnyRole(['admin', 'manager', 'Super Admin']);
                } catch (\Exception $e) {
                    Log::warning('Inbox: Failed to check user role', ['error' => $e->getMessage()]);
                }
            }
            return false;
        }

        // Check in inbox_senders table
        $sender = DB::table('inbox_senders')
            ->where('user_id', $userId)
            ->where('can_send', true)
            ->first();

        if ($sender) {
            return true;
        }

        // Fallback: check by role
        $user = User::find($userId);
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole(['admin', 'manager', 'Super Admin']);
            } catch (\Exception $e) {
                Log::warning('Inbox: Failed to check user role', ['error' => $e->getMessage()]);
            }
        }

        return false;
    }

    /**
     * Get inbox messages for current user
     */
    public function getInbox(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            if (!$this->checkInboxTables()) {
                return response()->json(['data' => [], 'total' => 0]);
            }

            $filter = $request->input('filter', 'inbox'); // inbox, sent, archived, all
            $perPage = $request->input('per_page', 20);

            $query = DB::table('inbox_messages')
                ->select(
                    'inbox_messages.*',
                    'sender.name as sender_name',
                    'sender.email as sender_email',
                    'sender.avatar as sender_avatar',
                    'recipient.name as recipient_name',
                    'recipient.email as recipient_email'
                )
                ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                ->join('users as recipient', 'inbox_messages.recipient_id', '=', 'recipient.id');

            switch ($filter) {
                case 'sent':
                    $query->where('inbox_messages.sender_id', $user->id)
                          ->where('inbox_messages.is_deleted_by_sender', false)
                          ->where('inbox_messages.is_archived_by_sender', false);
                    break;
                case 'archived':
                    $query->where(function($q) use ($user) {
                        // Archived received messages
                        $q->where(function($q2) use ($user) {
                            $q2->where('inbox_messages.recipient_id', $user->id)
                               ->where('inbox_messages.is_archived', true)
                               ->where('inbox_messages.is_deleted_by_recipient', false);
                        })
                        // Archived sent messages
                        ->orWhere(function($q2) use ($user) {
                            $q2->where('inbox_messages.sender_id', $user->id)
                               ->where('inbox_messages.is_archived_by_sender', true)
                               ->where('inbox_messages.is_deleted_by_sender', false);
                        });
                    });
                    break;
                case 'all':
                    $query->where(function($q) use ($user) {
                        $q->where(function($q2) use ($user) {
                            $q2->where('inbox_messages.recipient_id', $user->id)
                               ->where('inbox_messages.is_deleted_by_recipient', false);
                        })->orWhere(function($q2) use ($user) {
                            $q2->where('inbox_messages.sender_id', $user->id)
                               ->where('inbox_messages.is_deleted_by_sender', false);
                        });
                    });
                    break;
                default: // inbox
                    $query->where('inbox_messages.recipient_id', $user->id)
                          ->where('inbox_messages.is_archived', false)
                          ->where('inbox_messages.is_deleted_by_recipient', false);
                    break;
            }

            $messages = $query->orderBy('inbox_messages.created_at', 'desc')
                              ->paginate($perPage);

            // Add attachments count
            foreach ($messages->items() as $message) {
                if (Schema::hasTable('inbox_message_attachments')) {
                    $message->attachments_count = DB::table('inbox_message_attachments')
                        ->where('message_id', $message->id)
                        ->count();
                } else {
                    $message->attachments_count = 0;
                }
            }

            return response()->json($messages);
        } catch (\Exception $e) {
            Log::error('Error in getInbox', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load messages'], 500);
        }
    }

    /**
     * Get single message with full details
     */
    public function getMessage(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            if (!$this->checkInboxTables()) {
                return response()->json(['error' => 'Inbox tables do not exist'], 500);
            }

            $message = DB::table('inbox_messages')
                ->select(
                    'inbox_messages.*',
                    'sender.name as sender_name',
                    'sender.email as sender_email',
                    'sender.avatar as sender_avatar',
                    'recipient.name as recipient_name',
                    'recipient.email as recipient_email'
                )
                ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                ->join('users as recipient', 'inbox_messages.recipient_id', '=', 'recipient.id')
                ->where('inbox_messages.id', $messageId)
                ->where(function($q) use ($user) {
                    $q->where('inbox_messages.recipient_id', $user->id)
                      ->orWhere('inbox_messages.sender_id', $user->id);
                })
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Mark as read if recipient is viewing
            if ($message->recipient_id == $user->id && !$message->is_read) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update([
                        'is_read' => true,
                        'read_at' => now(),
                    ]);
                $message->is_read = true;
                $message->read_at = now();
            }

            // Load attachments
            if (Schema::hasTable('inbox_message_attachments')) {
                $message->attachments = DB::table('inbox_message_attachments')
                    ->where('message_id', $messageId)
                    ->get();
            } else {
                $message->attachments = [];
            }

            // Load thread (parent and replies)
            $message->thread = [];
            if ($message->parent_id) {
                $parent = DB::table('inbox_messages')
                    ->select('inbox_messages.*', 'sender.name as sender_name')
                    ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                    ->where('inbox_messages.id', $message->parent_id)
                    ->first();
                if ($parent) {
                    $message->thread[] = $parent;
                }
            }

            return response()->json($message);
        } catch (\Exception $e) {
            Log::error('Error in getMessage', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load message'], 500);
        }
    }

    /**
     * Send a new message
     */
    public function sendMessage(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            if (!$this->checkInboxTables()) {
                return response()->json(['error' => 'Inbox tables do not exist'], 500);
            }

            // Check if user can send
            if (!$this->canUserSend($user->id)) {
                return response()->json(['error' => 'Nemate dozvolu za slanje poruka'], 403);
            }

            $recipientType = $request->input('recipient_type', 'user');
            
            // Validate based on recipient type
            if ($recipientType === 'role') {
                $validator = Validator::make($request->all(), [
                    'role_id' => 'required|exists:roles,id',
                    'subject' => 'required|string|max:255',
                    'message' => 'required|string|max:10000',
                    'priority' => 'nullable|in:low,normal,high,urgent',
                ]);
            } else {
                $validator = Validator::make($request->all(), [
                    'recipient_id' => 'required|exists:users,id',
                    'subject' => 'required|string|max:255',
                    'message' => 'required|string|max:10000',
                    'priority' => 'nullable|in:low,normal,high,urgent',
                    'parent_id' => 'nullable|exists:inbox_messages,id',
                ]);
            }

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // If sending to a role, send to all users with that role
            if ($recipientType === 'role') {
                return $this->sendMessageToRole($request, $user);
            }

            // Can't send to self
            if ($request->input('recipient_id') == $user->id) {
                return response()->json(['error' => 'Ne možete slati poruke sebi'], 400);
            }

            $messageId = DB::table('inbox_messages')->insertGetId([
                'sender_id' => $user->id,
                'recipient_id' => $request->input('recipient_id'),
                'subject' => $request->input('subject'),
                'message' => $request->input('message'),
                'priority' => $request->input('priority', 'normal'),
                'parent_id' => $request->input('parent_id'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create notification for recipient
            if (Schema::hasTable('notifications')) {
                $recipient = User::find($request->input('recipient_id'));
                DB::table('notifications')->insert([
                    'user_id' => $request->input('recipient_id'),
                    'type' => 'inbox_message',
                    'title' => 'Nova poruka',
                    'message' => $user->name . ' vam je poslao poruku: ' . $request->input('subject'),
                    'action_url' => '/inbox/' . $messageId,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Send push notification
            try {
                PushNotificationService::sendToUser(
                    $request->input('recipient_id'),
                    'Nova poruka - ' . $user->name,
                    $request->input('subject'),
                    null,
                    '/inbox/' . $messageId,
                    ['type' => 'inbox_message', 'message_id' => $messageId]
                );
            } catch (\Exception $e) {
                Log::warning('Failed to send push notification for inbox message', [
                    'error' => $e->getMessage()
                ]);
            }

            $message = DB::table('inbox_messages')
                ->select(
                    'inbox_messages.*',
                    'sender.name as sender_name',
                    'recipient.name as recipient_name'
                )
                ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                ->join('users as recipient', 'inbox_messages.recipient_id', '=', 'recipient.id')
                ->where('inbox_messages.id', $messageId)
                ->first();

            return response()->json($message, 201);
        } catch (\Exception $e) {
            Log::error('Error in sendMessage', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to send message'], 500);
        }
    }

    /**
     * Send message to all users with a specific role
     */
    private function sendMessageToRole(Request $request, $sender)
    {
        try {
            $roleId = $request->input('role_id');
            
            // Get all users with the specified role (excluding sender)
            $recipients = DB::table('model_has_roles')
                ->join('users', 'model_has_roles.model_id', '=', 'users.id')
                ->where('model_has_roles.role_id', $roleId)
                ->where('model_has_roles.model_type', 'App\\Models\\User')
                ->where('users.id', '!=', $sender->id)
                ->select('users.id', 'users.name')
                ->get();

            if ($recipients->isEmpty()) {
                return response()->json(['error' => 'Nema korisnika s odabranom ulogom'], 400);
            }

            $messageIds = [];
            $subject = $request->input('subject');
            $messageContent = $request->input('message');
            $priority = $request->input('priority', 'normal');

            foreach ($recipients as $recipient) {
                $messageId = DB::table('inbox_messages')->insertGetId([
                    'sender_id' => $sender->id,
                    'recipient_id' => $recipient->id,
                    'subject' => $subject,
                    'message' => $messageContent,
                    'priority' => $priority,
                    'parent_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $messageIds[] = $messageId;

                // Create notification for each recipient
                if (Schema::hasTable('notifications')) {
                    DB::table('notifications')->insert([
                        'user_id' => $recipient->id,
                        'type' => 'inbox_message',
                        'title' => 'Nova poruka',
                        'message' => $sender->name . ' vam je poslao poruku: ' . $subject,
                        'action_url' => '/inbox/' . $messageId,
                        'is_read' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Send push notification
                try {
                    PushNotificationService::sendToUser(
                        $recipient->id,
                        'Nova poruka - ' . $sender->name,
                        $subject,
                        null,
                        '/inbox/' . $messageId,
                        ['type' => 'inbox_message', 'message_id' => $messageId]
                    );
                } catch (\Exception $e) {
                    Log::warning('Failed to send push notification for role message', [
                        'recipient_id' => $recipient->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Get role name for response
            $roleName = DB::table('roles')->where('id', $roleId)->value('name');

            return response()->json([
                'success' => true,
                'message' => 'Poruka poslana svim korisnicima s ulogom ' . $roleName,
                'recipients_count' => count($messageIds),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error in sendMessageToRole', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to send message to role'], 500);
        }
    }

    /**
     * Reply to a message
     */
    public function replyMessage(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            if (!$this->checkInboxTables()) {
                return response()->json(['error' => 'Inbox tables do not exist'], 500);
            }

            // Check if user can send
            if (!$this->canUserSend($user->id)) {
                return response()->json(['error' => 'Nemate dozvolu za slanje poruka'], 403);
            }

            $originalMessage = DB::table('inbox_messages')
                ->where('id', $messageId)
                ->where(function($q) use ($user) {
                    $q->where('recipient_id', $user->id)
                      ->orWhere('sender_id', $user->id);
                })
                ->first();

            if (!$originalMessage) {
                return response()->json(['error' => 'Original message not found'], 404);
            }

            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:10000',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Reply goes to the other person in the conversation
            $recipientId = $originalMessage->sender_id == $user->id 
                ? $originalMessage->recipient_id 
                : $originalMessage->sender_id;

            $newMessageId = DB::table('inbox_messages')->insertGetId([
                'sender_id' => $user->id,
                'recipient_id' => $recipientId,
                'subject' => 'Re: ' . $originalMessage->subject,
                'message' => $request->input('message'),
                'priority' => $originalMessage->priority,
                'parent_id' => $messageId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create notification
            if (Schema::hasTable('notifications')) {
                DB::table('notifications')->insert([
                    'user_id' => $recipientId,
                    'type' => 'inbox_message',
                    'title' => 'Novi odgovor na poruku',
                    'message' => $user->name . ' je odgovorio na: ' . $originalMessage->subject,
                    'action_url' => '/inbox/' . $newMessageId,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Send push notification
            try {
                PushNotificationService::sendToUser(
                    $recipientId,
                    'Novi odgovor - ' . $user->name,
                    'Odgovor na: ' . $originalMessage->subject,
                    null,
                    '/inbox/' . $newMessageId,
                    ['type' => 'inbox_reply', 'message_id' => $newMessageId]
                );
            } catch (\Exception $e) {
                Log::warning('Failed to send push notification for reply', [
                    'error' => $e->getMessage()
                ]);
            }

            $message = DB::table('inbox_messages')
                ->select('inbox_messages.*', 'sender.name as sender_name', 'recipient.name as recipient_name')
                ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                ->join('users as recipient', 'inbox_messages.recipient_id', '=', 'recipient.id')
                ->where('inbox_messages.id', $newMessageId)
                ->first();

            return response()->json($message, 201);
        } catch (\Exception $e) {
            Log::error('Error in replyMessage', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to reply to message'], 500);
        }
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            DB::table('inbox_messages')
                ->where('id', $messageId)
                ->where('recipient_id', $user->id)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return response()->json(['message' => 'Message marked as read']);
        } catch (\Exception $e) {
            Log::error('Error in markAsRead', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to mark as read'], 500);
        }
    }

    /**
     * Mark all messages as read
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $updated = DB::table('inbox_messages')
                ->where('recipient_id', $user->id)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return response()->json(['message' => 'All messages marked as read', 'count' => $updated]);
        } catch (\Exception $e) {
            Log::error('Error in markAllAsRead', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to mark all as read'], 500);
        }
    }

    /**
     * Archive message
     */
    public function archiveMessage(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $message = DB::table('inbox_messages')
                ->where('id', $messageId)
                ->where(function($q) use ($user) {
                    $q->where('recipient_id', $user->id)
                      ->orWhere('sender_id', $user->id);
                })
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Archive based on user role (sender or recipient)
            if ($message->sender_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_archived_by_sender' => true]);
            }
            if ($message->recipient_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_archived' => true]);
            }

            return response()->json(['message' => 'Message archived']);
        } catch (\Exception $e) {
            Log::error('Error in archiveMessage', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to archive message'], 500);
        }
    }

    /**
     * Unarchive message
     */
    public function unarchiveMessage(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $message = DB::table('inbox_messages')
                ->where('id', $messageId)
                ->where(function($q) use ($user) {
                    $q->where('recipient_id', $user->id)
                      ->orWhere('sender_id', $user->id);
                })
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Unarchive based on user role (sender or recipient)
            if ($message->sender_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_archived_by_sender' => false]);
            }
            if ($message->recipient_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_archived' => false]);
            }

            return response()->json(['message' => 'Message unarchived']);
        } catch (\Exception $e) {
            Log::error('Error in unarchiveMessage', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to unarchive message'], 500);
        }
    }

    /**
     * Delete message
     */
    public function deleteMessage(Request $request, $messageId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $message = DB::table('inbox_messages')
                ->where('id', $messageId)
                ->where(function($q) use ($user) {
                    $q->where('recipient_id', $user->id)
                      ->orWhere('sender_id', $user->id);
                })
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Soft delete based on user role
            if ($message->sender_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_deleted_by_sender' => true]);
            }
            if ($message->recipient_id == $user->id) {
                DB::table('inbox_messages')
                    ->where('id', $messageId)
                    ->update(['is_deleted_by_recipient' => true]);
            }

            // If both deleted, permanently delete
            $updated = DB::table('inbox_messages')
                ->where('id', $messageId)
                ->first();
            
            if ($updated && $updated->is_deleted_by_sender && $updated->is_deleted_by_recipient) {
                DB::table('inbox_messages')->where('id', $messageId)->delete();
            }

            return response()->json(['message' => 'Message deleted']);
        } catch (\Exception $e) {
            Log::error('Error in deleteMessage', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete message'], 500);
        }
    }

    /**
     * Get unread count (always returns 200 so frontend badge does not break)
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['count' => 0], 200);
            }

            if (!$this->checkInboxTables()) {
                return response()->json(['count' => 0], 200);
            }

            $query = DB::table('inbox_messages')->where('recipient_id', $user->id);
            if (Schema::hasColumn('inbox_messages', 'is_read')) {
                $query->where('is_read', false);
            }
            if (Schema::hasColumn('inbox_messages', 'is_deleted_by_recipient')) {
                $query->where('is_deleted_by_recipient', false);
            }
            $count = $query->count();

            return response()->json(['count' => $count], 200);
        } catch (\Throwable $e) {
            Log::warning('Error in getUnreadCount', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id ?? null,
            ]);
            return response()->json(['count' => 0], 200);
        }
    }

    /**
     * Get users for composing message
     */
    public function getRecipients(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            $users = DB::table('users')
                ->select('id', 'name', 'email', 'avatar')
                ->where('id', '!=', $user->id)
                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get();

            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Error in getRecipients', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    /**
     * Check if current user can send messages
     */
    public function checkSendPermission(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['can_send' => false]);
            }

            return response()->json(['can_send' => $this->canUserSend($user->id)]);
        } catch (\Exception $e) {
            Log::error('Error in checkSendPermission', ['error' => $e->getMessage()]);
            return response()->json(['can_send' => false]);
        }
    }

    /**
     * Get available roles for sending messages
     */
    public function getRoles(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            // Only users who can send can see roles
            if (!$this->canUserSend($user->id)) {
                return response()->json([]);
            }

            $roles = DB::table('roles')
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(function ($role) {
                    // Create display names for roles
                    $displayNames = [
                        'super-admin' => 'Super Administrator',
                        'admin' => 'Administrator',
                        'manager' => 'Menadžer',
                        'employee' => 'Zaposlenik',
                        'client' => 'Klijent',
                    ];
                    
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'display_name' => $displayNames[$role->name] ?? ucfirst($role->name),
                    ];
                });

            return response()->json($roles);
        } catch (\Exception $e) {
            Log::error('Error in getRoles', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    /**
     * Get recent messages for header dropdown
     */
    public function getRecentMessages(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            if (!$this->checkInboxTables()) {
                return response()->json([]);
            }

            $messages = DB::table('inbox_messages')
                ->select(
                    'inbox_messages.id',
                    'inbox_messages.subject',
                    'inbox_messages.is_read',
                    'inbox_messages.priority',
                    'inbox_messages.created_at',
                    'sender.name as sender_name',
                    'sender.avatar as sender_avatar'
                )
                ->join('users as sender', 'inbox_messages.sender_id', '=', 'sender.id')
                ->where('inbox_messages.recipient_id', $user->id)
                ->where('inbox_messages.is_deleted_by_recipient', false)
                ->orderBy('inbox_messages.created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json($messages);
        } catch (\Exception $e) {
            Log::error('Error in getRecentMessages', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * Get all senders (admin only)
     */
    public function getSenders(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->hasAnyRole(['admin', 'Super Admin'])) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('inbox_senders')) {
                return response()->json([]);
            }

            $senders = DB::table('inbox_senders')
                ->select(
                    'inbox_senders.*',
                    'users.name as user_name',
                    'users.email as user_email',
                    'granter.name as granted_by_name'
                )
                ->join('users', 'inbox_senders.user_id', '=', 'users.id')
                ->leftJoin('users as granter', 'inbox_senders.granted_by', '=', 'granter.id')
                ->orderBy('users.name')
                ->get();

            return response()->json($senders);
        } catch (\Exception $e) {
            Log::error('Error in getSenders', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load senders'], 500);
        }
    }

    /**
     * Grant send permission to user (admin only)
     */
    public function grantSendPermission(Request $request)
    {
        try {
            $admin = $request->user();
            if (!$admin || !$admin->hasAnyRole(['admin', 'Super Admin'])) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
                'note' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            if (!Schema::hasTable('inbox_senders')) {
                return response()->json(['error' => 'Inbox senders table not found'], 500);
            }

            DB::table('inbox_senders')->updateOrInsert(
                ['user_id' => $request->input('user_id')],
                [
                    'can_send' => true,
                    'note' => $request->input('note'),
                    'granted_by' => $admin->id,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            return response()->json(['message' => 'Send permission granted']);
        } catch (\Exception $e) {
            Log::error('Error in grantSendPermission', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to grant permission'], 500);
        }
    }

    /**
     * Revoke send permission from user (admin only)
     */
    public function revokeSendPermission(Request $request, $userId)
    {
        try {
            $admin = $request->user();
            if (!$admin || !$admin->hasAnyRole(['admin', 'Super Admin'])) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('inbox_senders')) {
                return response()->json(['error' => 'Inbox senders table not found'], 500);
            }

            DB::table('inbox_senders')
                ->where('user_id', $userId)
                ->update(['can_send' => false, 'updated_at' => now()]);

            return response()->json(['message' => 'Send permission revoked']);
        } catch (\Exception $e) {
            Log::error('Error in revokeSendPermission', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to revoke permission'], 500);
        }
    }
}

