<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Services\NotificationService;
use App\Services\ChatService;

class ChatNotificationTestSeeder extends Seeder
{
    public function run(): void
    {
        // Get some test users
        $users = DB::table('users')->limit(4)->get();
        
        if ($users->count() < 2) {
            $this->command->error('Need at least 2 users in database to create test data');
            return;
        }

        $user1 = $users[0];
        $user2 = $users[1];
        $user3 = $users->count() > 2 ? $users[2] : $user1;
        $user4 = $users->count() > 3 ? $users[3] : $user2;

        $this->command->info('Creating test chat conversations and notifications...');

        // Create test notifications
        $this->createTestNotifications($user1->id, $user2->id, $user3->id);
        
        // Create test chat conversations
        $this->createTestChatConversations($user1->id, $user2->id, $user3->id, $user4->id);

        $this->command->info('Test data created successfully!');
    }

    private function createTestNotifications($user1Id, $user2Id, $user3Id)
    {
        // Create various types of notifications for user1
        NotificationService::create(
            $user1Id,
            'task_assignment',
            'New Task Assignment',
            'You have been assigned to task: "Update user interface" by John Doe',
            '/projects/tasks/1'
        );

        NotificationService::create(
            $user1Id,
            'project_update',
            'Project Updated',
            'Jane Smith made changes to project: "Website Redesign"',
            '/projects/1'
        );

        NotificationService::create(
            $user1Id,
            'document_share',
            'Document Shared',
            'Mike Johnson shared a document with you: "Requirements Document.pdf"',
            '/dms/documents/1'
        );

        NotificationService::create(
            $user1Id,
            'chat_message',
            'New Message',
            'Sarah: Hey, can we discuss the project timeline?',
            '/chat?conversation=1'
        );

        NotificationService::create(
            $user1Id,
            'system_announcement',
            'System Maintenance',
            'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM',
            null
        );

        NotificationService::create(
            $user1Id,
            'deadline_reminder',
            'Deadline Reminder',
            'Reminder: Task "Complete user testing" is due tomorrow',
            '/projects/tasks/2'
        );

        NotificationService::create(
            $user1Id,
            'user_mention',
            'You were mentioned',
            'Alex mentioned you in project discussion: "Great work on the design!"',
            '/projects/1/discussions'
        );

        // Create some notifications for other users too
        NotificationService::create(
            $user2Id,
            'task_assignment',
            'New Task Assignment',
            'You have been assigned to task: "Code review" by Team Lead',
            '/projects/tasks/3'
        );

        NotificationService::create(
            $user2Id,
            'chat_message',
            'New Message',
            'Team: Meeting starts in 15 minutes',
            '/chat?conversation=2'
        );

        NotificationService::create(
            $user3Id,
            'approval_request',
            'Approval Required',
            'John Doe requests approval for leave: "Vacation - Dec 25-30"',
            '/hrm/leaves/1'
        );
    }

    private function createTestChatConversations($user1Id, $user2Id, $user3Id, $user4Id)
    {
        // Create private conversation
        $privateConvId = ChatService::createConversation(
            'private',
            null,
            [$user1Id, $user2Id],
            null,
            $user1Id
        );

        if ($privateConvId) {
            // Add some messages
            ChatService::sendMessage($privateConvId, $user1Id, 'Hey, how are you doing?');
            ChatService::sendMessage($privateConvId, $user2Id, 'I\'m good! Working on the new project. How about you?');
            ChatService::sendMessage($privateConvId, $user1Id, 'Same here! The deadline is approaching fast.');
            ChatService::sendMessage($privateConvId, $user2Id, 'Yes, we should meet tomorrow to discuss the progress.');
        }

        // Create group conversation
        $groupConvId = ChatService::createConversation(
            'group',
            'Development Team',
            [$user1Id, $user2Id, $user3Id, $user4Id],
            null,
            $user1Id
        );

        if ($groupConvId) {
            // Add some messages
            ChatService::sendMessage($groupConvId, $user1Id, 'Welcome to our development team chat!');
            ChatService::sendMessage($groupConvId, $user2Id, 'Thanks! Excited to work with everyone.');
            ChatService::sendMessage($groupConvId, $user3Id, 'Let\'s coordinate our tasks here.');
            ChatService::sendMessage($groupConvId, $user4Id, 'Sounds good! I\'ll share updates regularly.');
            ChatService::sendMessage($groupConvId, $user1Id, 'Perfect! Don\'t forget about the standup meeting tomorrow at 9 AM.');
        }

        // Create project conversation if we have a project
        $project = DB::table('projects')->first();
        if ($project) {
            $projectConvId = ChatService::createConversation(
                'project',
                'Project: ' . $project->name,
                [$user1Id, $user2Id, $user3Id],
                $project->id,
                $user1Id
            );

            if ($projectConvId) {
                ChatService::sendMessage($projectConvId, $user1Id, 'This is our project discussion channel.');
                ChatService::sendMessage($projectConvId, $user2Id, 'Great! I\'ll post updates here.');
                ChatService::sendMessage($projectConvId, $user3Id, 'Let me know if you need any help with the tasks.');
            }
        }
    }
}
















