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
        Schema::table('dms_folders', function (Blueprint $table) {
            if (!Schema::hasColumn('dms_folders', 'path')) {
                $table->string('path')->nullable()->after('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dms_folders', function (Blueprint $table) {
            if (Schema::hasColumn('dms_folders', 'path')) {
                $table->dropColumn('path');
            }
        });
    }
};

