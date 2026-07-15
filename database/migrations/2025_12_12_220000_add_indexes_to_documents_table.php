<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Add indexes for performance optimization
            // These indexes will speed up queries with large amounts of data
            
            // Index for folder filtering (most common query)
            if (!Schema::hasColumn('documents', 'folder_id')) {
                // If column doesn't exist, we can't add index
                return;
            }
            
            // Check if index already exists
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_folder_id_index'");
            if (empty($indexes)) {
                $table->index('folder_id', 'documents_folder_id_index');
            }
            
            // Index for search queries
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_name_index'");
            if (empty($indexes)) {
                $table->index('name', 'documents_name_index');
            }
            
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_original_name_index'");
            if (empty($indexes)) {
                $table->index('original_name', 'documents_original_name_index');
            }
            
            // Index for sorting by date
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_created_at_index'");
            if (empty($indexes)) {
                $table->index('created_at', 'documents_created_at_index');
            }
            
            // Index for uploaded_by filtering
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_uploaded_by_id_index'");
            if (empty($indexes)) {
                $table->index('uploaded_by_id', 'documents_uploaded_by_id_index');
            }
            
            // Composite index for folder + date sorting (common query pattern)
            $indexes = DB::select("SHOW INDEXES FROM documents WHERE Key_name = 'documents_folder_created_index'");
            if (empty($indexes)) {
                $table->index(['folder_id', 'created_at'], 'documents_folder_created_index');
            }
        });
        
        // Add indexes to dms_folders table
        Schema::table('dms_folders', function (Blueprint $table) {
            // Index for parent folder queries
            $indexes = DB::select("SHOW INDEXES FROM dms_folders WHERE Key_name = 'dms_folders_parent_folder_id_index'");
            if (empty($indexes)) {
                $table->index('parent_folder_id', 'dms_folders_parent_folder_id_index');
            }
            
            // Index for name searches
            $indexes = DB::select("SHOW INDEXES FROM dms_folders WHERE Key_name = 'dms_folders_name_index'");
            if (empty($indexes)) {
                $table->index('name', 'dms_folders_name_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop indexes if they exist
            try {
                $table->dropIndex('documents_folder_id_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('documents_name_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('documents_original_name_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('documents_created_at_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('documents_uploaded_by_id_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('documents_folder_created_index');
            } catch (\Exception $e) {}
        });
        
        Schema::table('dms_folders', function (Blueprint $table) {
            try {
                $table->dropIndex('dms_folders_parent_folder_id_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('dms_folders_name_index');
            } catch (\Exception $e) {}
        });
    }
};


















