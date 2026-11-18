<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hrm_leave_plan_items') || Schema::hasColumn('hrm_leave_plan_items', 'template_id')) {
            return;
        }

        Schema::table('hrm_leave_plan_items', function (Blueprint $table) {
            $table->foreignId('template_id')
                ->nullable()
                ->after('contract_id')
                ->constrained('hrm_decision_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('hrm_leave_plan_items') || !Schema::hasColumn('hrm_leave_plan_items', 'template_id')) {
            return;
        }

        Schema::table('hrm_leave_plan_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('template_id');
        });
    }
};
