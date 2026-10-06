<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lms_lessons') || Schema::hasColumn('lms_lessons', 'content_blocks')) {
            return;
        }

        Schema::table('lms_lessons', function (Blueprint $table) {
            $table->json('content_blocks')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('lms_lessons') || ! Schema::hasColumn('lms_lessons', 'content_blocks')) {
            return;
        }

        Schema::table('lms_lessons', function (Blueprint $table) {
            $table->dropColumn('content_blocks');
        });
    }
};
