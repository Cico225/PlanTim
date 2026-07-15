<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Regions (Regije)
        if (!Schema::hasTable('planika_maloprodaja_regions')) {
            Schema::create('planika_maloprodaja_regions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->foreignId('regional_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
            $table->index('regional_manager_id');
            });
        }

        // Stores (Prodavnice)
        if (!Schema::hasTable('planika_maloprodaja_stores')) {
            Schema::create('planika_maloprodaja_stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->foreignId('region_id')->constrained('planika_maloprodaja_regions')->cascadeOnDelete();
            $table->foreignId('store_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->json('opening_hours')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
            $table->index('region_id');
            $table->index('store_manager_id');
            });
        }

        // Activity Plans (Planovi aktivnosti)
        if (!Schema::hasTable('planika_maloprodaja_activity_plans')) {
            Schema::create('planika_maloprodaja_activity_plans', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('period_type', ['monthly', 'quarterly', 'yearly']);
            $table->json('target_regions')->nullable(); // Array of region IDs
            $table->json('target_stores')->nullable(); // Array of store IDs
            $table->json('goals')->nullable(); // JSON with goals (kvalitet usluge, izgled prodavnice, etc.)
            $table->integer('required_controls_per_month')->default(1);
            $table->json('deadlines')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', ['draft', 'active', 'completed', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('start_date');
            $table->index('end_date');
            $table->index('status');
            });
        }

        // Plan Assignments (Dodjeljivanje planova regionalnim menadžerima)
        if (!Schema::hasTable('planika_maloprodaja_plan_assignments')) {
            Schema::create('planika_maloprodaja_plan_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('planika_maloprodaja_activity_plans')->cascadeOnDelete();
            $table->foreignId('regional_manager_id')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            $table->unique(['plan_id', 'regional_manager_id'], 'plan_assignments_plan_manager_unique');
            $table->index('regional_manager_id');
            });
        }

        // Control Forms Templates (Obrasci za kontrole)
        if (!Schema::hasTable('planika_maloprodaja_control_forms')) {
            Schema::create('planika_maloprodaja_control_forms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('sections'); // JSON structure with sections and criteria
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
            $table->foreignId('controlled_by')->constrained('users')->cascadeOnDelete(); // Regional manager
            $table->date('control_date');
            $table->json('scores'); // JSON with section scores
            $table->decimal('total_score', 5, 2);
            $table->decimal('percentage_score', 5, 2);
            $table->text('overall_comment')->nullable();
            $table->json('recommendations')->nullable(); // Array of recommendations
            $table->json('corrective_measures')->nullable(); // Array of corrective measures
            $table->enum('status', ['draft', 'completed', 'reviewed'])->default('draft');
            $table->timestamps();

            $table->index('store_id');
            $table->index('control_date');
            $table->index('controlled_by');
            });
        }

        // Control Form Responses (Detaljni odgovori po stavci)
        if (!Schema::hasTable('planika_maloprodaja_control_responses')) {
            Schema::create('planika_maloprodaja_control_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_id')->constrained('planika_maloprodaja_store_controls')->cascadeOnDelete();
            $table->string('section_name');
            $table->string('criterion_name');
            $table->decimal('score', 5, 2)->nullable();
            $table->string('response')->nullable(); // Yes/No or text
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index('control_id');
            });
        }

        // Evaluation Criteria Templates (Kriteriji za ocjenjivanje)
        if (!Schema::hasTable('planika_maloprodaja_evaluation_criteria')) {
            Schema::create('planika_maloprodaja_evaluation_criteria', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('employee_type', ['salesperson', 'store_manager', 'both'])->default('both');
            $table->json('criteria'); // JSON structure with criteria
            $table->enum('rating_type', ['numeric', 'scale'])->default('numeric');
            $table->integer('max_rating')->default(5);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('employee_type');
            $table->index('is_active');
            });
        }

        // Employee Evaluations (Ocjenjivanje zaposlenika)
        if (!Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            Schema::create('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete(); // Regional manager
            $table->foreignId('evaluation_criteria_id')
                ->constrained('planika_maloprodaja_evaluation_criteria')
                ->cascadeOnDelete()
                ->name('emp_eval_criteria_fk');
            $table->date('evaluation_date');
            $table->date('period_start');
            $table->date('period_end');
            $table->json('scores'); // JSON with criteria scores
            $table->decimal('average_score', 5, 2);
            $table->string('rating', 50)->nullable(); // odličan, dobar, treba poboljšanje
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
            });
        }

        // Evaluation Criteria Responses (Detaljni odgovori po kriteriju)
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

        // Audit Log (Audit log za sve akcije)
        if (!Schema::hasTable('planika_maloprodaja_audit_logs')) {
            Schema::create('planika_maloprodaja_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action'); // created, updated, deleted, evaluated, controlled
            $table->string('entity_type'); // plan, control, evaluation, etc.
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
        Schema::dropIfExists('planika_maloprodaja_plan_assignments');
        Schema::dropIfExists('planika_maloprodaja_activity_plans');
        Schema::dropIfExists('planika_maloprodaja_stores');
        Schema::dropIfExists('planika_maloprodaja_regions');
    }
};

