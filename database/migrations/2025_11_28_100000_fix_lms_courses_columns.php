<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Popravlja nedostajuće kolone u lms_courses tabeli
     */
    public function up(): void
    {
        if (!Schema::hasTable('lms_courses')) {
            // Ako tabela ne postoji uopšte, kreiraj je potpuno
            Schema::create('lms_courses', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('cover_image')->nullable();
                $table->string('video_intro_url')->nullable();
                $table->json('attachments')->nullable();
                $table->string('category', 100)->nullable();
                $table->string('level', 50)->default('beginner');
                $table->integer('duration')->nullable();
                $table->boolean('is_published')->default(false);
                $table->boolean('is_featured')->default(false);
                $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->softDeletes();

                $table->index('category');
                $table->index('is_published');
            });
        } else {
            // Tabela postoji, dodaj nedostajuće kolone
            if (!Schema::hasColumn('lms_courses', 'duration')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    $table->integer('duration')->nullable()->after('level');
                });
            }

            if (!Schema::hasColumn('lms_courses', 'video_intro_url')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    $table->string('video_intro_url')->nullable()->after('cover_image');
                });
            }

            if (!Schema::hasColumn('lms_courses', 'attachments')) {
                Schema::table('lms_courses', function (Blueprint $table) {
                    $table->json('attachments')->nullable()->after('video_intro_url');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Ne brišemo kolone, samo za rollback
        if (Schema::hasColumn('lms_courses', 'attachments')) {
            Schema::table('lms_courses', function (Blueprint $table) {
                $table->dropColumn('attachments');
            });
        }

        if (Schema::hasColumn('lms_courses', 'video_intro_url')) {
            Schema::table('lms_courses', function (Blueprint $table) {
                $table->dropColumn('video_intro_url');
            });
        }

        if (Schema::hasColumn('lms_courses', 'duration')) {
            Schema::table('lms_courses', function (Blueprint $table) {
                $table->dropColumn('duration');
            });
        }
    }
};




