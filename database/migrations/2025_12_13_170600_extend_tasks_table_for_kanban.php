<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Dodaje kolone u tasks tabelu za Kanban i dodatne funkcionalnosti
     * POŠTUJE POSTOJEĆE - samo dodaje nove kolone sa nullable() proverom
     */
    public function up(): void
    {
        // Prvo dodaj kolone bez foreign key constrainta (kanban_columns tabela možda još ne postoji)
        Schema::table('tasks', function (Blueprint $table) {
            // Kanban kolona (opciono - ako nije postavljena, koristi se status)
            // Foreign key će biti dodat kasnije nakon kreiranja kanban_columns tabele
            if (!Schema::hasColumn('tasks', 'kanban_column_id')) {
                $table->unsignedBigInteger('kanban_column_id')->nullable()->after('status');
            }
            
            // Swimlane (za grupisanje u kanban view)
            if (!Schema::hasColumn('tasks', 'swimlane')) {
                $table->string('swimlane', 50)->nullable()->after('kanban_column_id'); // 'assignee', 'priority', 'epic'
            }
            
            // Epic ID (za grupisanje taskova u epike)
            if (!Schema::hasColumn('tasks', 'epic_id')) {
                $table->unsignedBigInteger('epic_id')->nullable()->after('swimlane');
            }
            
            // Story points (za Scrum)
            if (!Schema::hasColumn('tasks', 'story_points')) {
                $table->decimal('story_points', 4, 1)->nullable()->after('estimated_hours');
            }
            
            // Position u kanban koloni (za sortiranje u kanban view)
            // Postojeća 'order' kolona se koristi za opšte sortiranje (ako postoji)
            if (!Schema::hasColumn('tasks', 'position')) {
                // Dodaj na kraju ako 'order' kolona ne postoji
                if (Schema::hasColumn('tasks', 'order')) {
                    $table->integer('position')->default(0)->after('order');
                } else {
                    $table->integer('position')->default(0);
                }
            }
        });
        
        // Dodaj foreign key constraint samo ako kanban_columns tabela postoji
        if (Schema::hasTable('kanban_columns') && Schema::hasColumn('tasks', 'kanban_column_id')) {
            try {
                Schema::table('tasks', function (Blueprint $table) {
                    $table->foreign('kanban_column_id')->references('id')->on('kanban_columns')->nullOnDelete();
                });
            } catch (\Exception $e) {
                // Foreign key već postoji ili greška, ignoriši
            }
        }
        
        // Dodaj indexe ako ne postoje (sa try-catch za slučaj da već postoje)
        try {
            Schema::table('tasks', function (Blueprint $table) {
                if (Schema::hasColumn('tasks', 'kanban_column_id')) {
                    try {
                        $table->index('kanban_column_id', 'tasks_kanban_column_id_index');
                    } catch (\Exception $e) {
                        // Index već postoji, ignoriši
                    }
                }
                if (Schema::hasColumn('tasks', 'swimlane')) {
                    try {
                        $table->index('swimlane', 'tasks_swimlane_index');
                    } catch (\Exception $e) {
                        // Index već postoji, ignoriši
                    }
                }
            });
        } catch (\Exception $e) {
            // Ignoriši greške pri dodavanju indexa
        }
    }

    /**
     * Reverse the migrations.
     * NE BRIŠE kolone - samo dokumentuje rollback
     */
    public function down(): void
    {
        // Prema vodiču - NE BRIŠEMO kolone iz postojećih tabela
        // Ovo je samo dokumentacija rollback-a
        // U stvarnosti, ove kolone se NE brišu jer bi to moglo pokvariti postojeće funkcionalnosti
    }
};

