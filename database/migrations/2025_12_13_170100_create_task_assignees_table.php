<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira tabelu za višestruke assignee za taskove
     * Poštuje postojeće funkcionalnosti - dodaje novu funkcionalnost bez menjanja postojeće
     */
    public function up(): void
    {
        // Kreiraj task_assignees tabelu samo ako ne postoji
        if (!Schema::hasTable('task_assignees')) {
            Schema::create('task_assignees', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('assigned_at')->useCurrent();
                $table->timestamps();

                // Spreči duplikate - jedan user može biti assigned samo jednom na task
                $table->unique(['task_id', 'user_id']);
                
                // Indexi za brže query-je
                $table->index('task_id');
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
    }
};

















