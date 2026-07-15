<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Osigurava da lms_enrollments tabela postoji
     */
    public function up(): void
    {
        // Ensure lms_enrollments table exists
        if (!Schema::hasTable('lms_enrollments')) {
            Schema::create('lms_enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('enrolled_at');
                $table->timestamp('completed_at')->nullable();
                $table->integer('progress')->default(0);
                
                $table->unique(['course_id', 'user_id']);
            });
        }
        
        // Ensure lms_enrollments has all required columns
        if (Schema::hasTable('lms_enrollments')) {
            if (!Schema::hasColumn('lms_enrollments', 'min_passing_score')) {
                Schema::table('lms_enrollments', function (Blueprint $table) {
                    $table->integer('min_passing_score')->default(70)->nullable();
                });
            }
            if (!Schema::hasColumn('lms_enrollments', 'final_score')) {
                Schema::table('lms_enrollments', function (Blueprint $table) {
                    $table->decimal('final_score', 5, 2)->nullable();
                });
            }
            if (!Schema::hasColumn('lms_enrollments', 'grade')) {
                Schema::table('lms_enrollments', function (Blueprint $table) {
                    $table->string('grade', 5)->nullable();
                });
            }
            if (!Schema::hasColumn('lms_enrollments', 'recommend_retake')) {
                Schema::table('lms_enrollments', function (Blueprint $table) {
                    $table->boolean('recommend_retake')->default(false);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't drop anything - just for rollback if needed
    }
};



