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
                if (!Schema::hasColumn('hrm_departments', 'parent_department_id')) {
                    $table->foreignId('parent_department_id')->nullable()->after('division_type')
                        ->constrained('hrm_departments')
                        ->nullOnDelete();
                    $table->index('parent_department_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('hrm_departments')) {
            Schema::table('hrm_departments', function (Blueprint $table) {
                if (Schema::hasColumn('hrm_departments', 'parent_department_id')) {
                    $table->dropForeign(['parent_department_id']);
                    $table->dropIndex(['parent_department_id']);
                    $table->dropColumn('parent_department_id');
                }
            });
        }
    }
};









