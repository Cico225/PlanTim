<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class ChatController extends Controller
{
    /**
     * Check if chat tables exist
     */
    private function checkChatTables(): bool
    {
        return Schema::hasTable('chat_conversations') 
            && Schema::hasTable('chat_participants')
            && Schema::hasTable('chat_messages');
    }

    /**
     * Get user conversations
     */
    public function getConversations(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if tables exist
            if (!$this->checkChatTables()) {
                return response()->json([]);
            }

            $userId = $user->id;

            // Check if updated_at column exists
            $hasUpdatedAt = Schema::hasColumn('chat_conversations', 'updated_at');
            $orderByColumn = $hasUpdatedAt ? 'chat_conversations.updated_at' : 'chat_conversations.created_at';

            $conversations = DB::table('chat_conversations')
                ->select('chat_conversations.*')
                ->join('chat_participants', 'chat_conversations.id', '=', 'chat_participants.conversation_id')
                ->where('chat_participants.user_id', $userId)
                ->orderBy($orderByColumn, 'desc')
                ->get();

            // Get last message and unread count for each conversation
            foreach ($conversations as $conversation) {
                // Last message
                $conversation->last_message = DB::table('chat_messages')
                    ->select('chat_messages.*', 'users.name as user_name')
                    ->join('users', 'chat_messages.user_id', '=', 'users.id')
                    ->where('conversation_id', $conversation->id)
                    ->orderBy('created_at', 'desc')
                    ->first();

                // Unread count
                $lastReadAt = DB::table('chat_participants')
                    ->where('conversation_id', $conversation->id)
                    ->where('user_id', $userId)
                    ->value('last_read_at');
                
                $conversation->unread_count = DB::table('chat_messages')
                    ->where('conversation_id', $conversation->id)
                    ->where('user_id', '!=', $userId)
                    ->when($lastReadAt, function($query, $lastReadAt) {
                        return $query->where('created_at', '>', $lastReadAt);
                    })
                    ->count();

                // Participants
                $conversation->participants = DB::table('users')
                    ->select('users.id', 'users.name', 'users.email', 'users.avatar')
                    ->join('chat_participants', 'users.id', '=', 'chat_participants.user_id')
                    ->where('chat_participants.conversation_id', $conversation->id)
                    ->get();
            }

            return response()->json($conversations);
        } catch (\Exception $e) {
            Log::error('Error in getConversations', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load conversations'], 500);
        }
    }

    /**
     * Get conversation messages
     */
    public function getMessages(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if user is participant
            $isParticipant = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (!$isParticipant) {
                return response()->json(['error' => 'Access denied'], 403);
            }

            $messages = DB::table('chat_messages')
                ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar')
                ->join('users', 'chat_messages.user_id', '=', 'users.id')
                ->where('chat_messages.conversation_id', $conversationId)
                ->orderBy('chat_messages.created_at', 'asc')
                ->get();

            // Load attachments for each message
            if (Schema::hasTable('chat_message_attachments')) {
                foreach ($messages as $message) {
                    $message->attachments = DB::table('chat_message_attachments')
                        ->where('message_id', $message->id)
                        ->get();
                }
            }

            // Mark messages as read
            DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => now()]);

            return response()->json(['data' => $messages]);
        } catch (\Exception $e) {
            Log::error('Error in getMessages', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load messages'], 500);
        }
    }

    /**
     * Send message
     */
    public function sendMessage(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:5000',
                'type' => 'nullable|in:text,file,image,system',
                'file_url' => 'nullable|string',
                'file_name' => 'nullable|string',
                'file_size' => 'nullable|integer',
                'mime_type' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Check if user is participant
            $isParticipant = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (!$isParticipant) {
                return response()->json(['error' => 'Access denied'], 403);
            }

            $messageId = DB::table('chat_messages')->insertGetId([
                'conversation_id' => $conversationId,
                'user_id' => $user->id,
                'message' => $request->input('message'),
                'type' => $request->input('type', 'text'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Save file attachment if provided
            if ($request->input('file_url') && $request->input('file_name') && Schema::hasTable('chat_message_attachments')) {
                DB::table('chat_message_attachments')->insert([
                    'message_id' => $messageId,
                    'file_name' => $request->input('file_name'),
                    'file_path' => $request->input('file_url'),
                    'file_size' => $request->input('file_size', 0),
                    'mime_type' => $request->input('mime_type', 'application/octet-stream'),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Update conversation timestamp
            DB::table('chat_conversations')
                ->where('id', $conversationId)
                ->update(['updated_at' => now(), 'last_message_at' => now()]);

            $message = DB::table('chat_messages')
                ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar')
                ->join('users', 'chat_messages.user_id', '=', 'users.id')
                ->where('chat_messages.id', $messageId)
                ->first();

            // Load attachments
            if (Schema::hasTable('chat_message_attachments')) {
                $message->attachments = DB::table('chat_message_attachments')
                    ->where('message_id', $messageId)
                    ->get();
            }

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
     * Create new conversation
     */
    public function createConversation(Request $request)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'required|in:private,group,project',
                'name' => 'nullable|string|max:255',
                'participants' => 'required|array|min:1',
                'participants.*' => 'exists:users,id',
                'project_id' => 'nullable|exists:projects,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Create conversation
            $conversationId = DB::table('chat_conversations')->insertGetId([
                'type' => $request->input('type'),
                'name' => $request->input('name'),
                'project_id' => $request->input('project_id'),
                'created_by' => $user->id,
                'last_message_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Add participants
            $participants = $request->input('participants');
            
            // Add creator if not in list
            if (!in_array($user->id, $participants)) {
                $participants[] = $user->id;
            }

            foreach ($participants as $userId) {
                DB::table('chat_participants')->insert([
                    'conversation_id' => $conversationId,
                    'user_id' => $userId,
                    'joined_at' => now(),
                ]);
            }

            // Get the complete conversation
            $conversation = DB::table('chat_conversations')->find($conversationId);
            
            // Add participants
            $conversation->participants = DB::table('users')
                ->select('users.id', 'users.name', 'users.email', 'users.avatar')
                ->join('chat_participants', 'users.id', '=', 'chat_participants.user_id')
                ->where('chat_participants.conversation_id', $conversationId)
                ->get();

            $conversation->last_message = null;
            $conversation->unread_count = 0;

            return response()->json($conversation, 201);
        } catch (\Exception $e) {
            Log::error('Error in createConversation', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to create conversation'], 500);
        }
    }

    /**
     * Get users for chat (excluding current user)
     */
    public function getUsers(Request $request)
    {
        try {
            $currentUser = $request->user();
            if (!$currentUser) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }
            
            $currentUserId = $currentUser->id;
            
            // Get all users except current user
            // No is_active filter - show all users for chat
            $users = DB::table('users')
                ->select('id', 'name', 'email', 'avatar')
                ->where('id', '!=', $currentUserId)
                ->orderBy('name', 'asc')
                ->get();

            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Error loading chat users', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load users'], 500);
        }
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => now()]);

            return response()->json(['message' => 'Messages marked as read']);
        } catch (\Exception $e) {
            Log::error('Error in markAsRead', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to mark messages as read'], 500);
        }
    }

    /**
     * Upload file for chat
     */
    public function uploadFile(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,zip',
                'conversation_id' => 'required|exists:chat_conversations,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = $request->user();
            $conversationId = (int) $request->input('conversation_id');

            $isParticipant = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (! $isParticipant) {
                return response()->json(['error' => 'Access denied'], 403);
            }

            $file = $request->file('file');
            $originalName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            
            // Store file
            $filename = time() . '_' . $originalName;
            $path = $file->storeAs('chat_files', $filename, 'public');
            
            return response()->json([
                'file_url' => '/storage/' . $path,
                'file_name' => $originalName,
                'file_size' => $size,
                'mime_type' => $mimeType,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in uploadFile', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to upload file'], 500);
        }
    }

    /**
     * Search messages
     */
    public function searchMessages(Request $request)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'query' => 'required|string|min:2',
                'conversation_id' => 'nullable|exists:chat_conversations,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $query = DB::table('chat_messages')
                ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar', 'chat_conversations.name as conversation_name')
                ->join('users', 'chat_messages.user_id', '=', 'users.id')
                ->join('chat_conversations', 'chat_messages.conversation_id', '=', 'chat_conversations.id')
                ->join('chat_participants', 'chat_conversations.id', '=', 'chat_participants.conversation_id')
                ->where('chat_participants.user_id', $user->id)
                ->where('chat_messages.message', 'LIKE', '%' . $request->input('query') . '%');

            if ($request->has('conversation_id')) {
                $query->where('chat_messages.conversation_id', $request->input('conversation_id'));
            }

            $messages = $query->orderBy('chat_messages.created_at', 'desc')
                ->paginate(20);

            return response()->json($messages);
        } catch (\Exception $e) {
            Log::error('Error in searchMessages', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to search messages'], 500);
        }
    }

    /**
     * Get conversation info
     */
    public function getConversationInfo(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $conversation = DB::table('chat_conversations')
                ->where('id', $conversationId)
                ->first();

            if (!$conversation) {
                return response()->json(['error' => 'Conversation not found'], 404);
            }

            // Check if user is participant
            $isParticipant = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (!$isParticipant) {
                return response()->json(['error' => 'Access denied'], 403);
            }

            // Get participants
            $conversation->participants = DB::table('users')
                ->select('users.id', 'users.name', 'users.email', 'users.avatar', 'chat_participants.joined_at')
                ->join('chat_participants', 'users.id', '=', 'chat_participants.user_id')
                ->where('chat_participants.conversation_id', $conversationId)
                ->get();

            // Get project info if it's a project conversation
            if ($conversation->project_id && Schema::hasTable('projects')) {
                $conversation->project = DB::table('projects')
                    ->select('id', 'name', 'description', 'status')
                    ->where('id', $conversation->project_id)
                    ->first();
            }

            return response()->json($conversation);
        } catch (\Exception $e) {
            Log::error('Error in getConversationInfo', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load conversation info'], 500);
        }
    }

    /**
     * Add participant to conversation
     */
    public function addParticipant(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Check if conversation exists and user is participant
            $conversation = DB::table('chat_conversations')
                ->join('chat_participants', 'chat_conversations.id', '=', 'chat_participants.conversation_id')
                ->where('chat_conversations.id', $conversationId)
                ->where('chat_participants.user_id', $user->id)
                ->first();

            if (!$conversation) {
                return response()->json(['error' => 'Conversation not found or access denied'], 404);
            }

            // Check if user is already participant
            $exists = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $request->input('user_id'))
                ->exists();

            if ($exists) {
                return response()->json(['error' => 'User is already a participant'], 400);
            }

            // Add participant
            DB::table('chat_participants')->insert([
                'conversation_id' => $conversationId,
                'user_id' => $request->input('user_id'),
                'joined_at' => now(),
            ]);

            // Send system message
            DB::table('chat_messages')->insert([
                'conversation_id' => $conversationId,
                'user_id' => $user->id,
                'message' => 'User added to conversation',
                'type' => 'system',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['message' => 'Participant added successfully']);
        } catch (\Exception $e) {
            Log::error('Error in addParticipant', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to add participant'], 500);
        }
    }

    /**
     * Remove participant from conversation
     */
    public function removeParticipant(Request $request, $conversationId, $userId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if conversation exists and user is participant
            $conversation = DB::table('chat_conversations')
                ->join('chat_participants', 'chat_conversations.id', '=', 'chat_participants.conversation_id')
                ->where('chat_conversations.id', $conversationId)
                ->where('chat_participants.user_id', $user->id)
                ->first();

            if (!$conversation) {
                return response()->json(['error' => 'Conversation not found or access denied'], 404);
            }

            // Remove participant
            DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $userId)
                ->delete();

            // Send system message
            DB::table('chat_messages')->insert([
                'conversation_id' => $conversationId,
                'user_id' => $user->id,
                'message' => 'User removed from conversation',
                'type' => 'system',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['message' => 'Participant removed successfully']);
        } catch (\Exception $e) {
            Log::error('Error in removeParticipant', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to remove participant'], 500);
        }
    }

    /**
     * Delete message
     */
    public function deleteMessage(Request $request, $messageId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $message = DB::table('chat_messages')
                ->where('id', $messageId)
                ->where('user_id', $user->id)
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found or access denied'], 404);
            }

            DB::table('chat_messages')
                ->where('id', $messageId)
                ->update([
                    'message' => 'This message was deleted',
                    'type' => 'deleted',
                    'updated_at' => now(),
                ]);

            return response()->json(['message' => 'Message deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteMessage', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to delete message'], 500);
        }
    }

    /**
     * Edit message
     */
    public function editMessage(Request $request, $messageId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:5000',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $message = DB::table('chat_messages')
                ->where('id', $messageId)
                ->where('user_id', $user->id)
                ->first();

            if (!$message) {
                return response()->json(['error' => 'Message not found or access denied'], 404);
            }

            DB::table('chat_messages')
                ->where('id', $messageId)
                ->update([
                    'message' => $request->input('message'),
                    'is_edited' => true,
                    'edited_at' => now(),
                    'updated_at' => now(),
                ]);

            $updatedMessage = DB::table('chat_messages')
                ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar')
                ->join('users', 'chat_messages.user_id', '=', 'users.id')
                ->where('chat_messages.id', $messageId)
                ->first();

            return response()->json($updatedMessage);
        } catch (\Exception $e) {
            Log::error('Error in editMessage', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to edit message'], 500);
        }
    }

    /**
     * Delete conversation
     */
    public function deleteConversation(Request $request, $conversationId)
    {
        try {
            if (!$this->checkChatTables()) {
                return response()->json(['error' => 'Chat tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $conversation = DB::table('chat_conversations')
                ->where('id', $conversationId)
                ->first();

            if (!$conversation) {
                return response()->json(['error' => 'Conversation not found'], 404);
            }

            // Check if user is participant
            $isParticipant = DB::table('chat_participants')
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (!$isParticipant) {
                return response()->json(['error' => 'Access denied'], 403);
            }

            // For private conversations, any participant can delete
            // For group/project conversations, check if user is creator
            if ($conversation->type !== 'private') {
                $isCreator = $conversation->created_by === $user->id;
                
                if (!$isCreator) {
                    return response()->json(['error' => 'Only conversation creator can delete this conversation'], 403);
                }
            }

            // Delete conversation (cascade will handle related records)
            DB::table('chat_conversations')
                ->where('id', $conversationId)
                ->delete();

            return response()->json(['message' => 'Conversation deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteConversation', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to delete conversation'], 500);
        }
    }
}
