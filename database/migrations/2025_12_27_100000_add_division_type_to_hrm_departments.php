<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hrm_departments')) {
            Schema::table('hrm_departments', function (Blueprint $table) {
                if (!Schema::hasColumn('hrm_departments', 'division_type')) {
                    $table->enum('division_type', ['direkcija', 'maloprodaja'])->nullable()->after('description');
                    $table->index('division_type');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('hrm_departments')) {
            Schema::table('hrm_departments', function (Blueprint $table) {
                if (Schema::hasColumn('hrm_departments', 'division_type')) {
                    $table->dropIndex(['division_type']);
                    $table->dropColumn('division_type');
                }
            });
        }
    }
};

