<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Dodaje foreign key constraint-e nakon kreiranja svih tabela
     * Ovo osigurava da se foreign key-ovi pravilno kreiraju
     */
    public function up(): void
    {
        // Dodaj foreign key za tasks.kanban_column_id
        if (Schema::hasTable('tasks') && Schema::hasTable('kanban_columns') && Schema::hasColumn('tasks', 'kanban_column_id')) {
            try {
                // Proveri da li foreign key već postoji
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'tasks' 
                    AND COLUMN_NAME = 'kanban_column_id' 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");
                
                if (empty($foreignKeys)) {
                    Schema::table('tasks', function (Blueprint $table) {
                        $table->foreign('kanban_column_id')->references('id')->on('kanban_columns')->nullOnDelete();
                    });
                }
            } catch (\Exception $e) {
                // Foreign key već postoji ili greška, ignoriši
            }
        }
        
        // Dodaj foreign key za task_comment_mentions.comment_id
        if (Schema::hasTable('task_comment_mentions') && Schema::hasTable('task_comments') && Schema::hasColumn('task_comment_mentions', 'comment_id')) {
            try {
                // Proveri da li foreign key već postoji
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'task_comment_mentions' 
                    AND COLUMN_NAME = 'comment_id' 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");
                
                if (empty($foreignKeys)) {
                    Schema::table('task_comment_mentions', function (Blueprint $table) {
                        $table->foreign('comment_id')->references('id')->on('task_comments')->cascadeOnDelete();
                    });
                }
            } catch (\Exception $e) {
                // Foreign key već postoji ili greška, ignoriši
            }
        }
    }

    /**
     * Reverse the migrations.
     * NE BRIŠE foreign key-eve - samo dokumentuje rollback
     */
    public function down(): void
    {
        // Prema vodiču - NE BRIŠEMO constraint-e jer bi to moglo pokvariti funkcionalnosti
    }
};

