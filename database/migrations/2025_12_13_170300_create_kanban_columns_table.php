<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira tabelu za customizabilne Kanban kolone po projektu
     * Omogućava svakom projektu da ima svoje kolone sa WIP limitima
     */
    public function up(): void
    {
        if (!Schema::hasTable('kanban_columns')) {
            Schema::create('kanban_columns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->string('name'); // Naziv kolone (npr. "To Do", "In Progress", "Done")
                $table->string('status', 50); // Mapiranje na task status (npr. 'todo', 'in-progress', 'review', 'done')
                $table->integer('order')->default(0); // Redosled kolona
                $table->integer('wip_limit')->nullable(); // Work In Progress limit (NULL = bez limita)
                $table->string('color', 20)->nullable(); // Boja kolone (hex kod)
                $table->boolean('is_default')->default(false); // Da li je default kolona
                $table->timestamps();

                // Indexi
                $table->index('project_id');
                $table->index(['project_id', 'order']);
                
                // Unique constraint: jedan status može biti mapiran samo na jednu kolonu u projektu
                $table->unique(['project_id', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_columns');
    }
};

















