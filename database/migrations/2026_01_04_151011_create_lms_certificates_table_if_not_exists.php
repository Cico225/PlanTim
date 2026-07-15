<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira lms_certificates tabelu ako ne postoji
     */
    public function up(): void
    {
        if (!Schema::hasTable('lms_certificates')) {
            Schema::create('lms_certificates', function (Blueprint $table) {
                $table->id();
                
                // Foreign keys
                if (Schema::hasTable('lms_courses')) {
                    $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                } else {
                    $table->unsignedBigInteger('course_id')->nullable();
                }
                
                if (Schema::hasTable('users')) {
                    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                } else {
                    $table->unsignedBigInteger('user_id');
                }
                
                // Certificate details
                $table->string('certificate_number', 100)->unique();
                $table->decimal('final_score', 5, 2)->nullable();
                $table->string('grade', 5)->nullable();
                $table->timestamp('issued_at');
                $table->timestamp('expires_at')->nullable();
                $table->string('file_path')->nullable();
                
                // Unique constraint - one certificate per course per user
                $table->unique(['course_id', 'user_id']);
                
                // Indexes
                $table->index('user_id');
                $table->index('course_id');
                $table->index('issued_at');
            });
        } else {
            // Table exists, but check if columns exist and add them if missing
            if (!Schema::hasColumn('lms_certificates', 'final_score')) {
                Schema::table('lms_certificates', function (Blueprint $table) {
                    $table->decimal('final_score', 5, 2)->nullable()->after('certificate_number');
                });
            }
            
            if (!Schema::hasColumn('lms_certificates', 'grade')) {
                Schema::table('lms_certificates', function (Blueprint $table) {
                    $table->string('grade', 5)->nullable()->after('final_score');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't drop the table in down() as it might be used
        // Only drop if this migration specifically created it
        // Schema::dropIfExists('lms_certificates');
    }
};
