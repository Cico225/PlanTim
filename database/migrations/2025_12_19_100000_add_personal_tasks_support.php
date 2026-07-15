<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Make project_id nullable to support personal tasks
        // Drop foreign key constraint first (try different possible constraint names)
        try {
            DB::statement('ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_project_id_foreign`');
        } catch (\Exception $e) {
            // Try alternative constraint name
            try {
                DB::statement('ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_project_id_foreign`');
            } catch (\Exception $e2) {
                // Try to find and drop by column
                try {
                    $constraints = DB::select("
                        SELECT CONSTRAINT_NAME 
                        FROM information_schema.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'tasks' 
                        AND COLUMN_NAME = 'project_id'
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    ");
                    foreach ($constraints as $constraint) {
                        DB::statement("ALTER TABLE `tasks` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`");
                    }
                } catch (\Exception $e3) {
                    // Ignore if constraint doesn't exist
                }
            }
        }
        
        // Change column to nullable
        DB::statement('ALTER TABLE `tasks` MODIFY `project_id` BIGINT UNSIGNED NULL');
        
        // Re-add foreign key constraint with nullOnDelete
        DB::statement('ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_foreign` 
            FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL');
    }

    public function down(): void
    {
        // Delete tasks without project_id first (before making column required)
        DB::table('tasks')->whereNull('project_id')->delete();
        
        // Now make project_id required again
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable(false)->change();
        });
    }
};

