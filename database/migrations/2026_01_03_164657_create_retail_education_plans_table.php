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
        Schema::create('retail_education_plans', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('store_id')->constrained('hrm_stores')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('hrm_employees')->onDelete('cascade');
            $table->date('education_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('education_type'); // 'internal', 'external', 'online', 'workshop'
            $table->string('topic')->nullable();
            $table->text('content')->nullable();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location')->nullable();
            $table->enum('status', ['planned', 'in_progress', 'completed', 'cancelled'])->default('planned');
            $table->date('completed_date')->nullable();
            $table->text('notes')->nullable();
            $table->text('feedback')->nullable();
            $table->integer('rating')->nullable(); // 1-5 rating
            $table->timestamps();

            $table->index('store_id');
            $table->index('employee_id');
            $table->index('education_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retail_education_plans');
    }
};
