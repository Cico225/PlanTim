<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hrm_leave_plan_items')) {
            return;
        }

        Schema::create('hrm_leave_plan_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('hrm_employment_contracts')->nullOnDelete();
            $table->date('date_from');
            $table->date('date_to');
            $table->unsignedSmallInteger('days');
            $table->string('status', 20)->default('planned');
            $table->foreignId('decision_id')->nullable()->constrained('hrm_decisions')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->index(['year', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_leave_plan_items');
    }
};
