<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hrm_education_programs')) {
            Schema::create('hrm_education_programs', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('education_type', 40)->default('internal'); // internal, external, online, workshop
                $table->string('topic')->nullable();
                $table->string('provider')->nullable();
                $table->string('location')->nullable();
                $table->unsignedInteger('duration_hours')->nullable();
                $table->decimal('cost', 12, 2)->nullable();
                $table->string('currency', 10)->default('BAM');
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->unsignedInteger('max_participants')->nullable();
                $table->string('status', 30)->default('draft'); // draft, open, in_progress, completed, cancelled
                $table->boolean('issues_certificate')->default(false);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('status');
                $table->index('education_type');
                $table->index('start_date');
            });
        }

        if (!Schema::hasTable('hrm_education_enrollments')) {
            Schema::create('hrm_education_enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('program_id')->constrained('hrm_education_programs')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->string('status', 30)->default('planned'); // planned, in_progress, completed, cancelled, no_show
                $table->date('enrolled_at')->nullable();
                $table->date('completed_at')->nullable();
                $table->unsignedTinyInteger('rating')->nullable();
                $table->text('feedback')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['program_id', 'employee_id']);
                $table->index('status');
                $table->index('employee_id');
            });
        }

        if (!Schema::hasTable('hrm_education_certificates')) {
            Schema::create('hrm_education_certificates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('program_id')->nullable()->constrained('hrm_education_programs')->nullOnDelete();
                $table->foreignId('enrollment_id')->nullable()->constrained('hrm_education_enrollments')->nullOnDelete();
                $table->string('title');
                $table->string('issuer')->nullable();
                $table->string('certificate_number')->nullable();
                $table->date('issued_at')->nullable();
                $table->date('expires_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('expires_at');
            });
        }

        if (!Schema::hasTable('hrm_development_plans')) {
            Schema::create('hrm_development_plans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->string('title');
                $table->text('goals')->nullable();
                $table->json('activities')->nullable();
                $table->date('start_date')->nullable();
                $table->date('target_date')->nullable();
                $table->string('status', 30)->default('active'); // draft, active, completed, cancelled
                $table->unsignedTinyInteger('progress_percent')->default(0);
                $table->text('notes')->nullable();
                $table->foreignId('mentor_id')->nullable()->constrained('hrm_employees')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('hrm_talent_profiles')) {
            Schema::create('hrm_talent_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->string('performance_level', 20)->default('medium'); // low, medium, high
                $table->string('potential_level', 20)->default('medium'); // low, medium, high
                $table->boolean('in_talent_pool')->default(true);
                $table->string('readiness', 30)->nullable(); // ready_now, 1_2_years, 3_plus_years
                $table->json('competencies')->nullable();
                $table->json('development_activities')->nullable();
                $table->text('strengths')->nullable();
                $table->text('development_areas')->nullable();
                $table->text('goals')->nullable();
                $table->date('review_date')->nullable();
                $table->date('next_review_date')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique('employee_id');
                $table->index(['performance_level', 'potential_level'], 'hrm_talent_perf_pot_idx');
                $table->index('in_talent_pool');
            });
        }

        if (!Schema::hasTable('hrm_career_paths')) {
            Schema::create('hrm_career_paths', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->string('current_position')->nullable();
                $table->string('target_position')->nullable();
                $table->foreignId('target_work_position_id')->nullable()->constrained('hrm_work_positions')->nullOnDelete();
                $table->string('horizon', 30)->nullable(); // short, medium, long
                $table->string('status', 30)->default('active'); // draft, active, achieved, cancelled
                $table->json('milestones')->nullable();
                $table->text('notes')->nullable();
                $table->date('target_date')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('employee_id');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('hrm_succession_plans')) {
            Schema::create('hrm_succession_plans', function (Blueprint $table) {
                $table->id();
                $table->string('position_title');
                $table->foreignId('work_position_id')->nullable()->constrained('hrm_work_positions')->nullOnDelete();
                $table->foreignId('incumbent_employee_id')->nullable()->constrained('hrm_employees')->nullOnDelete();
                $table->foreignId('successor_employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->string('readiness', 30)->default('1_2_years'); // ready_now, 1_2_years, 3_plus_years
                $table->unsignedTinyInteger('priority')->default(2); // 1 high, 2 medium, 3 low
                $table->string('status', 30)->default('active'); // active, completed, cancelled
                $table->text('development_actions')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('successor_employee_id');
                $table->index('status');
                $table->index('readiness');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_succession_plans');
        Schema::dropIfExists('hrm_career_paths');
        Schema::dropIfExists('hrm_talent_profiles');
        Schema::dropIfExists('hrm_development_plans');
        Schema::dropIfExists('hrm_education_certificates');
        Schema::dropIfExists('hrm_education_enrollments');
        Schema::dropIfExists('hrm_education_programs');
    }
};
