<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove Kanban board structures while keeping tasks and other project features.
     * Keeps: epic_id, story_points, position (used outside Kanban).
     * Removes: kanban_columns table, tasks.kanban_column_id, tasks.swimlane.
     */
    public function up(): void
    {
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'kanban_column_id')) {
            $this->dropForeignKeysOnColumn('tasks', 'kanban_column_id');
            $this->dropIndexesOnColumn('tasks', 'kanban_column_id');

            Schema::table('tasks', function (Blueprint $table) {
                $table->dropColumn('kanban_column_id');
            });
        }

        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'swimlane')) {
            $this->dropIndexesOnColumn('tasks', 'swimlane');

            Schema::table('tasks', function (Blueprint $table) {
                $table->dropColumn('swimlane');
            });
        }

        Schema::dropIfExists('kanban_columns');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('kanban_columns')) {
            Schema::create('kanban_columns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->string('name');
                $table->string('status', 50);
                $table->integer('order')->default(0);
                $table->integer('wip_limit')->nullable();
                $table->string('color', 20)->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamps();

                $table->index('project_id');
                $table->index(['project_id', 'order']);
                $table->unique(['project_id', 'status']);
            });
        }

        if (!Schema::hasTable('tasks')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'kanban_column_id')) {
                $table->unsignedBigInteger('kanban_column_id')->nullable()->after('status');
            }
            if (!Schema::hasColumn('tasks', 'swimlane')) {
                $table->string('swimlane', 50)->nullable()->after(
                    Schema::hasColumn('tasks', 'kanban_column_id') ? 'kanban_column_id' : 'status'
                );
            }
        });

        if (Schema::hasColumn('tasks', 'kanban_column_id')) {
            try {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->foreign('kanban_column_id')->references('id')->on('kanban_columns')->nullOnDelete();
                    $table->index('kanban_column_id', 'tasks_kanban_column_id_index');
                });
            } catch (\Exception $e) {
                // Ignore if already exists
            }
        }

        if (Schema::hasColumn('tasks', 'swimlane')) {
            try {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->index('swimlane', 'tasks_swimlane_index');
                });
            } catch (\Exception $e) {
                // Ignore if already exists
            }
        }
    }

    private function dropForeignKeysOnColumn(string $table, string $column): void
    {
        try {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = ?
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$table, $column]);

            foreach ($foreignKeys as $fk) {
                $name = $fk->CONSTRAINT_NAME;
                DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$name}`");
            }
        } catch (\Exception $e) {
            // Ignore if FK already gone
        }
    }

    private function dropIndexesOnColumn(string $table, string $column): void
    {
        try {
            $indexes = DB::select("
                SELECT DISTINCT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = ?
                AND INDEX_NAME != 'PRIMARY'
            ", [$table, $column]);

            foreach ($indexes as $index) {
                $name = $index->INDEX_NAME;
                // Skip unique/foreign leftovers that may already be dropped
                try {
                    DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$name}`");
                } catch (\Exception $e) {
                    // Ignore
                }
            }
        } catch (\Exception $e) {
            // Ignore
        }
    }
};
