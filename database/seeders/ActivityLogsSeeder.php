<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\User;

class ActivityLogsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get existing users
        $users = User::all();
        
        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please seed users first.');
            return;
        }

        $this->command->info('Creating test activity logs...');

        $logEntries = [];

        // Simulate various activities over the last 7 days
        $activities = [
            // User Management Activities
            ['log_name' => 'user', 'description' => 'created user', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'user', 'description' => 'updated user', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'user', 'description' => 'deleted user', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'user', 'description' => 'activated user', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'user', 'description' => 'deactivated user', 'subject_type' => 'App\Models\User'],
            
            // Role & Permission Activities
            ['log_name' => 'role', 'description' => 'created role', 'subject_type' => 'Spatie\Permission\Models\Role'],
            ['log_name' => 'role', 'description' => 'updated role', 'subject_type' => 'Spatie\Permission\Models\Role'],
            ['log_name' => 'role', 'description' => 'assigned role to user', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'permission', 'description' => 'granted permission', 'subject_type' => 'Spatie\Permission\Models\Permission'],
            
            // System Activities
            ['log_name' => 'system', 'description' => 'updated system settings', 'subject_type' => null],
            ['log_name' => 'system', 'description' => 'performed system backup', 'subject_type' => null],
            ['log_name' => 'system', 'description' => 'cleared system cache', 'subject_type' => null],
            
            // Project Activities
            ['log_name' => 'project', 'description' => 'created project', 'subject_type' => 'App\Models\Project'],
            ['log_name' => 'project', 'description' => 'updated project', 'subject_type' => 'App\Models\Project'],
            ['log_name' => 'project', 'description' => 'deleted project', 'subject_type' => 'App\Models\Project'],
            
            // Document Activities
            ['log_name' => 'document', 'description' => 'uploaded document', 'subject_type' => 'App\Models\Document'],
            ['log_name' => 'document', 'description' => 'downloaded document', 'subject_type' => 'App\Models\Document'],
            ['log_name' => 'document', 'description' => 'deleted document', 'subject_type' => 'App\Models\Document'],
            
            // Authentication Activities
            ['log_name' => 'auth', 'description' => 'user logged in', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'auth', 'description' => 'user logged out', 'subject_type' => 'App\Models\User'],
            ['log_name' => 'auth', 'description' => 'password changed', 'subject_type' => 'App\Models\User'],
        ];

        // Create logs for different time periods
        $now = Carbon::now();
        
        for ($i = 0; $i < 50; $i++) {
            $activity = $activities[array_rand($activities)];
            $causer = $users->random();
            $subject = null;
            $subjectId = null;
            
            // Assign subject if applicable
            if ($activity['subject_type']) {
                // For User activities, use a random user
                if ($activity['subject_type'] === 'App\Models\User') {
                    $subject = $users->random();
                    $subjectId = $subject->id;
                } else {
                    // For other models, use random ID (since models might not exist)
                    $subjectId = rand(1, 100);
                }
            }
            
            // Create description with details
            $description = $this->createDescription($activity['description'], $causer, $subject);
            
            // Random time in the last 7 days
            $createdAt = $now->copy()->subDays(rand(0, 7))->subHours(rand(0, 23))->subMinutes(rand(0, 59));
            
            $logEntries[] = [
                'log_name' => $activity['log_name'],
                'description' => $description,
                'subject_type' => $activity['subject_type'],
                'subject_id' => $subjectId,
                'causer_type' => 'App\Models\User',
                'causer_id' => $causer->id,
                'properties' => json_encode([
                    'attributes' => $this->getRandomAttributes(),
                    'old' => $this->getRandomAttributes(),
                ]),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        }

        // Insert logs in batches
        $chunks = array_chunk($logEntries, 50);
        foreach ($chunks as $chunk) {
            DB::table('activity_log')->insert($chunk);
        }

        $this->command->info('✓ Created ' . count($logEntries) . ' test activity logs!');
        $this->command->info('Logs span the last 7 days with various activities.');
    }

    /**
     * Create a detailed description for the activity log
     */
    private function createDescription(string $activity, User $causer, $subject = null): string
    {
        $descriptions = [
            'created user' => "{$causer->name} created user " . ($subject ? $subject->name : 'new user'),
            'updated user' => "{$causer->name} updated user " . ($subject ? $subject->name : 'user'),
            'deleted user' => "{$causer->name} deleted user " . ($subject ? $subject->name : 'user'),
            'activated user' => "{$causer->name} activated user " . ($subject ? $subject->name : 'user'),
            'deactivated user' => "{$causer->name} deactivated user " . ($subject ? $subject->name : 'user'),
            'created role' => "{$causer->name} created role",
            'updated role' => "{$causer->name} updated role",
            'assigned role to user' => "{$causer->name} assigned role to user " . ($subject ? $subject->name : 'user'),
            'granted permission' => "{$causer->name} granted permission",
            'updated system settings' => "{$causer->name} updated system settings",
            'performed system backup' => "{$causer->name} performed system backup",
            'cleared system cache' => "{$causer->name} cleared system cache",
            'created project' => "{$causer->name} created project",
            'updated project' => "{$causer->name} updated project",
            'deleted project' => "{$causer->name} deleted project",
            'uploaded document' => "{$causer->name} uploaded document",
            'downloaded document' => "{$causer->name} downloaded document",
            'deleted document' => "{$causer->name} deleted document",
            'user logged in' => "{$causer->name} logged in",
            'user logged out' => "{$causer->name} logged out",
            'password changed' => "{$causer->name} changed password",
        ];

        return $descriptions[$activity] ?? "{$causer->name} {$activity}";
    }

    /**
     * Get random attributes for properties
     */
    private function getRandomAttributes(): array
    {
        $attributes = [
            'name' => ['John Doe', 'Jane Smith', 'Test User', 'Admin User'][array_rand(['John Doe', 'Jane Smith', 'Test User', 'Admin User'])],
            'email' => ['test@example.com', 'user@example.com', 'admin@example.com'][array_rand(['test@example.com', 'user@example.com', 'admin@example.com'])],
            'status' => ['active', 'inactive', 'pending'][array_rand(['active', 'inactive', 'pending'])],
            'is_active' => rand(0, 1) === 1,
        ];

        return array_slice($attributes, 0, rand(1, 3));
    }
}
