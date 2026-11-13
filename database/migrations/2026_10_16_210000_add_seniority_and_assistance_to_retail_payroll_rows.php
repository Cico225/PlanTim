<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('retail_payroll_rows')) {
            return;
        }

        Schema::table('retail_payroll_rows', function (Blueprint $table) {
            if (!Schema::hasColumn('retail_payroll_rows', 'seniority')) {
                $table->decimal('seniority', 12, 2)->nullable()->after('meal_allowance');
            }
            if (!Schema::hasColumn('retail_payroll_rows', 'assistance_stimulation')) {
                $table->decimal('assistance_stimulation', 12, 2)->nullable()->after('seniority');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('retail_payroll_rows')) {
            return;
        }

        Schema::table('retail_payroll_rows', function (Blueprint $table) {
            foreach (['seniority', 'assistance_stimulation'] as $col) {
                if (Schema::hasColumn('retail_payroll_rows', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
