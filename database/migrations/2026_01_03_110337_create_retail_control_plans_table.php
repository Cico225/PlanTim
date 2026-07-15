<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('retail_control_plans', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'inventory_required', 'inventory_extraordinary', 'store_visit'
            $table->string('title');
            $table->text('description')->nullable();
            $table->year('year');
            $table->foreignId('regional_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'active', 'completed', 'cancelled'])->default('draft');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('deadline')->nullable();
            $table->integer('total_stores')->default(0);
            $table->integer('completed_stores')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('year');
            $table->index('status');
            $table->index('regional_manager_id');
        });

        // Plan items - pojedinačne aktivnosti po prodavnicama
        Schema::create('retail_control_plan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('retail_control_plans')->onDelete('cascade');
            $table->foreignId('store_id')->constrained('hrm_stores')->onDelete('cascade');
            $table->date('planned_date');
            $table->date('completed_date')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'])->default('pending');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->text('findings')->nullable(); // Nalazi iz kontrole
            $table->integer('priority')->default(0); // Prioritet (0 = normalan, 1 = visok, 2 = kritičan)
            $table->timestamps();

            $table->index('plan_id');
            $table->index('store_id');
            $table->index('status');
            $table->index('planned_date');
            $table->index('assigned_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retail_control_plan_items');
        Schema::dropIfExists('retail_control_plans');
    }
};
