<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Dodaje kolonu is_published u lms_lessons tabelu ako ne postoji
     */
    public function up(): void
    {
        if (Schema::hasTable('lms_lessons')) {
            if (!Schema::hasColumn('lms_lessons', 'is_published')) {
                Schema::table('lms_lessons', function (Blueprint $table) {
                    $table->boolean('is_published')->default(true)->after('order');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lms_lessons')) {
            if (Schema::hasColumn('lms_lessons', 'is_published')) {
                Schema::table('lms_lessons', function (Blueprint $table) {
                    $table->dropColumn('is_published');
                });
            }
        }
    }
};



