<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira tabelu za activity log specifičan za projekte i taskove
     * Bilježi sve promene: status, assign, komentare, upload dokumenata, etc.
     */
    public function up(): void
    {
        if (!Schema::hasTable('project_activities')) {
            Schema::create('project_activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
                $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
                $table->string('entity_type', 50)->default('task'); // 'project' ili 'task'
                $table->string('action', 50); // 'created', 'updated', 'status_changed', 'assigned', 'commented', 'file_uploaded', etc.
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->json('old_value')->nullable(); // Stara vrednost pre promene
                $table->json('new_value')->nullable(); // Nova vrednost posle promene
                $table->json('metadata')->nullable(); // Dodatni podaci (npr. kanban move, dependency info)
                $table->text('description')->nullable(); // Opis akcije
                $table->timestamps();

                // Indexi za brže query-je
                $table->index('project_id');
                $table->index('task_id');
                $table->index('entity_type');
                $table->index(['project_id', 'entity_type']);
                $table->index('created_at'); // Za sortiranje po datumu
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_activities');
    }
};

















