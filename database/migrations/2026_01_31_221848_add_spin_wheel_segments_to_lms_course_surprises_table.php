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
        if (Schema::hasTable('lms_course_surprises')) {
            Schema::table('lms_course_surprises', function (Blueprint $table) {
                if (!Schema::hasColumn('lms_course_surprises', 'spin_wheel_segments')) {
                    $table->integer('spin_wheel_segments')->default(8)->after('spin_wheel_cooldown_hours');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lms_course_surprises')) {
            Schema::table('lms_course_surprises', function (Blueprint $table) {
                if (Schema::hasColumn('lms_course_surprises', 'spin_wheel_segments')) {
                    $table->dropColumn('spin_wheel_segments');
                }
            });
        }
    }
};
