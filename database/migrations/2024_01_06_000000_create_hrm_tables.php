<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Departments
        Schema::create('hrm_departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('parent_department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
            $table->timestamps();

            $table->index('manager_id');
        });

        // Employees
        Schema::create('hrm_employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('employee_number', 50)->unique();
            $table->foreignId('department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
            $table->string('position');
            $table->string('employment_type', 50)->default('full_time');
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->decimal('salary', 15, 2)->nullable();
            $table->string('currency', 10)->default('BAM');
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('emergency_contact')->nullable();
            $table->timestamps();

            $table->index('employee_number');
            $table->index('department_id');
        });

        // Leave Types
        Schema::create('hrm_leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('days_per_year')->default(0);
            $table->boolean('is_paid')->default(true);
            $table->boolean('requires_approval')->default(true);
            $table->string('color', 20)->nullable();
            $table->timestamps();
        });

        // Leaves
        Schema::create('hrm_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('hrm_leave_types')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days', 4, 1);
            $table->text('reason')->nullable();
            $table->string('status', 50)->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index(['start_date', 'end_date']);
        });

        // Attendances
        Schema::create('hrm_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->date('date');
            $table->timestamp('check_in')->nullable();
            $table->timestamp('check_out')->nullable();
            $table->decimal('working_hours', 4, 2)->nullable();
            $table->string('status', 50)->default('present');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
            $table->index('date');
        });

        // Evaluations
        Schema::create('hrm_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('overall_rating', 3, 2);
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('goals')->nullable();
            $table->text('comments')->nullable();
            $table->string('status', 50)->default('draft');
            $table->timestamps();

            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_evaluations');
        Schema::dropIfExists('hrm_attendances');
        Schema::dropIfExists('hrm_leaves');
        Schema::dropIfExists('hrm_leave_types');
        Schema::dropIfExists('hrm_employees');
        Schema::dropIfExists('hrm_departments');
    }
};

