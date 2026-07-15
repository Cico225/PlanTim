<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kompletan fix za LMS module - osigurava da sve tabele i kolone postoje
     */
    public function up(): void
    {
        // 1. Ensure lms_courses table has all required columns
        if (Schema::hasTable('lms_courses')) {
            if (!Schema::hasColumn('lms_courses', 'duration')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    if (Schema::hasColumn('lms_courses', 'level')) {
                        $table->integer('duration')->nullable()->after('level');
                    } else {
                        $table->integer('duration')->nullable();
                    }
                });
            }
            if (!Schema::hasColumn('lms_courses', 'video_intro_url')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    if (Schema::hasColumn('lms_courses', 'cover_image')) {
                        $table->string('video_intro_url')->nullable()->after('cover_image');
                    } else {
                        $table->string('video_intro_url')->nullable();
                    }
                });
            }
            if (!Schema::hasColumn('lms_courses', 'attachments')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    if (Schema::hasColumn('lms_courses', 'video_intro_url')) {
                        $table->json('attachments')->nullable()->after('video_intro_url');
                    } else {
                        $table->json('attachments')->nullable();
                    }
                });
            }
        }

        // 2. Ensure lms_lessons table has is_published column
        if (Schema::hasTable('lms_lessons')) {
            if (!Schema::hasColumn('lms_lessons', 'is_published')) {
                Schema::table('lms_lessons', function (Blueprint $table) {
                    $table->boolean('is_published')->default(true)->after('order');
                });
            }
        }

        // 3. Ensure lms_quizzes table exists (if needed but not created)
        if (!Schema::hasTable('lms_quizzes')) {
            Schema::create('lms_quizzes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->integer('passing_score')->default(70);
                $table->integer('time_limit')->nullable();
                $table->integer('max_attempts')->nullable();
                $table->integer('order')->default(0);
                $table->boolean('is_published')->default(false);
                $table->timestamps();
            });
        }

        // 4. Ensure lms_course_user_groups table exists
        if (!Schema::hasTable('lms_course_user_groups')) {
            Schema::create('lms_course_user_groups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->string('group_type', 50)->default('role');
                $table->string('group_value');
                $table->timestamps();
                
                $table->unique(['course_id', 'group_type', 'group_value']);
                $table->index('course_id');
            });
        }

        // 5. Ensure lms_enrollments table exists
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

