<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add created_by column if it doesn't exist
        if (!Schema::hasColumn('tasks', 'created_by')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('order');
            });
            
            // If there are existing tasks without created_by, set them to the first admin user or null
            // This is a fallback - ideally tasks should have a creator
            $firstUserId = DB::table('users')->value('id');
            if ($firstUserId) {
                DB::table('tasks')->whereNull('created_by')->update(['created_by' => $firstUserId]);
            }
        }
    }

    public function down(): void
    {
        // Remove created_by column if it exists
        if (Schema::hasColumn('tasks', 'created_by')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            });
        }
    }
};








