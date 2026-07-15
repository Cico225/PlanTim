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
        // Talents (Career Development) Table
        if (!Schema::hasTable('planika_maloprodaja_talents')) {
            Schema::create('planika_maloprodaja_talents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('store_id')->nullable()->constrained('planika_maloprodaja_stores')->nullOnDelete();
                $table->enum('performance_level', ['low', 'medium', 'high'])->default('medium');
                $table->enum('potential_level', ['low', 'medium', 'high'])->default('medium');
                $table->json('competencies')->nullable();
                $table->json('development_activities')->nullable();
                $table->text('goals')->nullable();
                $table->date('target_completion')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('store_id');
                $table->index(['performance_level', 'potential_level'], 'talents_perf_pot_idx');
            });
        }

        // Rewards and Bonuses Table
        if (!Schema::hasTable('planika_maloprodaja_rewards')) {
            Schema::create('planika_maloprodaja_rewards', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->enum('type', ['financial', 'non_financial']);
                $table->string('reward_type', 255); // Godišnji bonus, Pohvalnica, etc.
                $table->decimal('amount', 10, 2)->nullable();
                $table->string('currency', 10)->default('BAM');
                $table->text('reason');
                $table->date('date');
                $table->enum('status', ['pending', 'approved', 'paid'])->default('pending');
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('type');
                $table->index('status');
                $table->index('date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_rewards');
        Schema::dropIfExists('planika_maloprodaja_talents');
    }
};

