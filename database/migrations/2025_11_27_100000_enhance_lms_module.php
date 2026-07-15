<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Dodaje nove funkcionalnosti u LMS modul:
     * - Grupe korisnika za kurseve
     * - Proširenja za multimedijalni sadržaj
     * - Ocjene i procenat uspješnosti
     * - Preporuke za ponovno polaganje
     */
    public function up(): void
    {
        // Tabela za grupe korisnika (veza između rola i kurseva)
        if (!Schema::hasTable('lms_course_user_groups')) {
            Schema::create('lms_course_user_groups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->string('group_type', 50)->default('role'); // 'role', 'department', 'custom'
                $table->string('group_value'); // role name, department id, custom group id
                $table->timestamps();
                
                $table->unique(['course_id', 'group_type', 'group_value']);
                $table->index('course_id');
            });
        }

        // Proširenja za kurseve - multimedijalni sadržaj
        if (!Schema::hasColumn('lms_courses', 'video_intro_url')) {
            Schema::table('lms_courses', function (Blueprint $table) {
                $table->string('video_intro_url')->nullable()->after('cover_image');
                $table->json('attachments')->nullable()->after('video_intro_url'); // JSON array za fajlove
            });
        }

        // Proširenja za lekcije - slike i dodatni fajlovi
        if (!Schema::hasColumn('lms_lessons', 'image_url')) {
            Schema::table('lms_lessons', function (Blueprint $table) {
                $table->string('image_url')->nullable()->after('video_url');
                $table->json('additional_files')->nullable()->after('image_url'); // JSON array za dodatne fajlove
            });
        }

        // Proširenja za enrollment - ocjena i procenat
        if (!Schema::hasColumn('lms_enrollments', 'final_score')) {
            Schema::table('lms_enrollments', function (Blueprint $table) {
                $table->decimal('final_score', 5, 2)->nullable()->after('progress'); // 0-100
                $table->string('grade', 5)->nullable()->after('final_score'); // A, B, C, D, F ili 1-5
                $table->boolean('recommend_retake')->default(false)->after('grade');
                $table->integer('min_passing_score')->default(70)->after('recommend_retake');
            });
        }

        // Proširenja za quiz attempts - detaljnije praćenje
        if (!Schema::hasColumn('lms_quiz_attempts', 'attempt_number')) {
            Schema::table('lms_quiz_attempts', function (Blueprint $table) {
                $table->integer('attempt_number')->default(1)->after('user_id');
                $table->decimal('percentage', 5, 2)->nullable()->after('score');
                $table->string('grade', 5)->nullable()->after('percentage');
                $table->boolean('recommend_retake')->default(false)->after('grade');
                $table->json('question_results')->nullable()->after('answers'); // Detalji za svako pitanje
            });
        }

        // Tabela za praćenje pitanja u kvizu (progresivno)
        if (!Schema::hasTable('lms_quiz_question_attempts')) {
            Schema::create('lms_quiz_question_attempts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_attempt_id')->constrained('lms_quiz_attempts')->cascadeOnDelete();
                $table->foreignId('question_id')->constrained('lms_quiz_questions')->cascadeOnDelete();
                $table->text('user_answer')->nullable();
                $table->boolean('is_correct')->default(false);
                $table->integer('points_earned')->default(0);
                $table->integer('time_spent')->nullable(); // sekunde
                $table->timestamp('answered_at')->nullable();
                $table->timestamps();
                
                $table->unique(['quiz_attempt_id', 'question_id']);
                $table->index(['quiz_attempt_id', 'question_id']);
            });
        }

        // Proširenja za certifikate
        if (!Schema::hasColumn('lms_certificates', 'final_score')) {
            Schema::table('lms_certificates', function (Blueprint $table) {
                $table->decimal('final_score', 5, 2)->nullable()->after('certificate_number');
                $table->string('grade', 5)->nullable()->after('final_score');
            });
        }

        // Tabela za praćenje pregledanog sadržaja (za progress tracking)
        if (!Schema::hasTable('lms_content_views')) {
            Schema::create('lms_content_views', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->string('content_type', 50); // 'lesson', 'video', 'document'
                $table->unsignedBigInteger('content_id');
                $table->integer('view_duration')->default(0); // sekunde
                $table->boolean('is_completed')->default(false);
                $table->timestamp('viewed_at');
                $table->timestamps();
                
                $table->index(['user_id', 'course_id']);
                $table->index(['content_type', 'content_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback: brišemo samo ono što je dodato
        Schema::dropIfExists('lms_content_views');
        Schema::dropIfExists('lms_quiz_question_attempts');
        Schema::dropIfExists('lms_course_user_groups');
        
        // Vraćanje kolona
        if (Schema::hasColumn('lms_certificates', 'grade')) {
            Schema::table('lms_certificates', function (Blueprint $table) {
                $table->dropColumn(['final_score', 'grade']);
            });
        }
        
        if (Schema::hasColumn('lms_quiz_attempts', 'attempt_number')) {
            Schema::table('lms_quiz_attempts', function (Blueprint $table) {
                $table->dropColumn(['attempt_number', 'percentage', 'grade', 'recommend_retake', 'question_results']);
            });
        }
        
        if (Schema::hasColumn('lms_enrollments', 'final_score')) {
            Schema::table('lms_enrollments', function (Blueprint $table) {
                $table->dropColumn(['final_score', 'grade', 'recommend_retake', 'min_passing_score']);
            });
        }
        
        if (Schema::hasColumn('lms_lessons', 'image_url')) {
            Schema::table('lms_lessons', function (Blueprint $table) {
                $table->dropColumn(['image_url', 'additional_files']);
            });
        }
        
        if (Schema::hasColumn('lms_courses', 'video_intro_url')) {
            Schema::table('lms_courses', function (Blueprint $table) {
                $table->dropColumn(['video_intro_url', 'attachments']);
            });
        }
    }
};




