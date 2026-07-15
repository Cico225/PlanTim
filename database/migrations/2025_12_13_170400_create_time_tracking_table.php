<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira tabelu za time tracking na taskovima
     * Omogućava praćenje vremena rada na taskovima
     */
    public function up(): void
    {
        if (!Schema::hasTable('time_tracking')) {
            Schema::create('time_tracking', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete(); // Denormalizacija za brže query-je
                $table->timestamp('started_at'); // Kada je počeo rad
                $table->timestamp('ended_at')->nullable(); // Kada je završio rad (NULL = još uvek radi)
                $table->integer('duration')->nullable(); // Trajanje u sekundama (NULL ako još traje)
                $table->text('description')->nullable(); // Opis rada
                $table->boolean('is_running')->default(false); // Da li je timer trenutno aktivan
                $table->timestamps();

                // Indexi za brže query-je
                $table->index('task_id');
                $table->index('user_id');
                $table->index('project_id');
                $table->index(['user_id', 'started_at']); // Za timesheet view
                $table->index('is_running'); // Za pronalaženje aktivnih timera
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_tracking');
    }
};

















