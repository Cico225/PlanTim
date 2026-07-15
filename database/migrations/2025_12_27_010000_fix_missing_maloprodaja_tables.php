<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Control Forms Templates (Obrasci za kontrole)
        if (!Schema::hasTable('planika_maloprodaja_control_forms')) {
            Schema::create('planika_maloprodaja_control_forms', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->json('sections');
                $table->enum('scoring_type', ['numeric', 'yes_no', 'scale'])->default('numeric');
                $table->integer('max_score')->default(100);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->index('is_active');
            });
        }

        // Store Controls (Kontrole prodavnica)
        if (!Schema::hasTable('planika_maloprodaja_store_controls')) {
            Schema::create('planika_maloprodaja_store_controls', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
                $table->foreignId('plan_id')->nullable()->constrained('planika_maloprodaja_activity_plans')->nullOnDelete();
                $table->foreignId('control_form_id')->constrained('planika_maloprodaja_control_forms')->cascadeOnDelete();
                $table->foreignId('controlled_by')->constrained('users')->cascadeOnDelete();
                $table->date('control_date');
                $table->json('scores');
                $table->decimal('total_score', 5, 2);
                $table->decimal('percentage_score', 5, 2);
                $table->text('overall_comment')->nullable();
                $table->json('recommendations')->nullable();
                $table->json('corrective_measures')->nullable();
                $table->enum('status', ['draft', 'completed', 'reviewed'])->default('draft');
                $table->timestamps();

                $table->index('store_id');
                $table->index('control_date');
                $table->index('controlled_by');
            });
        }

        // Control Form Responses
        if (!Schema::hasTable('planika_maloprodaja_control_responses')) {
            Schema::create('planika_maloprodaja_control_responses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('control_id')->constrained('planika_maloprodaja_store_controls')->cascadeOnDelete();
                $table->string('section_name');
                $table->string('criterion_name');
                $table->decimal('score', 5, 2)->nullable();
                $table->string('response')->nullable();
                $table->text('comment')->nullable();
                $table->timestamps();
                $table->index('control_id');
            });
        }

        // Evaluation Criteria Templates
        if (!Schema::hasTable('planika_maloprodaja_evaluation_criteria')) {
            Schema::create('planika_maloprodaja_evaluation_criteria', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->enum('employee_type', ['salesperson', 'store_manager', 'both'])->default('both');
                $table->json('criteria');
                $table->enum('rating_type', ['numeric', 'scale'])->default('numeric');
                $table->integer('max_rating')->default(5);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('employee_type');
                $table->index('is_active');
            });
        }

        // Employee Evaluations
        if (!Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            Schema::create('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
                $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedBigInteger('evaluation_criteria_id');
                $table->date('evaluation_date');
                $table->date('period_start');
                $table->date('period_end');
                $table->json('scores');
                $table->decimal('average_score', 5, 2);
                $table->string('rating', 50)->nullable();
                $table->text('overall_comment')->nullable();
                $table->json('recommendations')->nullable();
                $table->enum('status', ['draft', 'completed', 'acknowledged'])->default('draft');
                $table->enum('signature_status', ['draft', 'evaluator_signed', 'employee_signed', 'completed'])->default('draft')->nullable();
                $table->timestamp('acknowledged_at')->nullable();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('store_id');
                $table->index('evaluation_date');
                $table->index('evaluator_id');
                
                // Add foreign key with shorter name
                $table->foreign('evaluation_criteria_id', 'emp_eval_criteria_fk')
                    ->references('id')
                    ->on('planika_maloprodaja_evaluation_criteria')
                    ->onDelete('cascade');
            });
        }

        // Evaluation Responses
        if (!Schema::hasTable('planika_maloprodaja_evaluation_responses')) {
            Schema::create('planika_maloprodaja_evaluation_responses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('evaluation_id')->constrained('planika_maloprodaja_employee_evaluations')->cascadeOnDelete();
                $table->string('criterion_name');
                $table->decimal('score', 5, 2);
                $table->text('comment')->nullable();
                $table->timestamps();
                $table->index('evaluation_id');
            });
        }

        // Audit Logs
        if (!Schema::hasTable('planika_maloprodaja_audit_logs')) {
            Schema::create('planika_maloprodaja_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->string('action');
                $table->string('entity_type');
                $table->unsignedBigInteger('entity_id');
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->json('old_values')->nullable();
                $table->json('new_values')->nullable();
                $table->text('description')->nullable();
                $table->ipAddress('ip_address')->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamps();

                $table->index(['entity_type', 'entity_id']);
                $table->index('user_id');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_audit_logs');
        Schema::dropIfExists('planika_maloprodaja_evaluation_responses');
        Schema::dropIfExists('planika_maloprodaja_employee_evaluations');
        Schema::dropIfExists('planika_maloprodaja_evaluation_criteria');
        Schema::dropIfExists('planika_maloprodaja_control_responses');
        Schema::dropIfExists('planika_maloprodaja_store_controls');
        Schema::dropIfExists('planika_maloprodaja_control_forms');
    }
};

