<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stores (Prodavnice)
        if (!Schema::hasTable('hrm_stores')) {
            Schema::create('hrm_stores', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code', 50)->nullable()->unique();
                $table->foreignId('department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
                $table->foreignId('store_manager_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('address')->nullable();
                $table->string('city')->nullable();
                $table->string('phone', 50)->nullable();
                $table->string('email')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('department_id');
                $table->index('code');
                $table->index('is_active');
            });
        }

        // Work Positions (Radna mjesta)
        if (!Schema::hasTable('hrm_work_positions')) {
            Schema::create('hrm_work_positions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code', 50)->nullable()->unique();
                $table->foreignId('department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
                $table->foreignId('store_id')->nullable()->constrained('hrm_stores')->nullOnDelete();
                $table->text('description')->nullable();
                $table->text('requirements')->nullable();
                $table->string('employment_type')->default('full-time'); // full-time, part-time, contract, intern
                $table->decimal('min_salary', 15, 2)->nullable();
                $table->decimal('max_salary', 15, 2)->nullable();
                $table->integer('max_employees')->nullable(); // Maksimalan broj zaposlenih na ovom radnom mjestu
                $table->integer('current_employees')->default(0); // Trenutni broj zaposlenih
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('department_id');
                $table->index('store_id');
                $table->index('code');
                $table->index('is_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_work_positions');
        Schema::dropIfExists('hrm_stores');
    }
};









