<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = ['regular_days', 'sick_leave_days', 'annual_leave_days'];

    public function up(): void
    {
        if (!Schema::hasTable('retail_payroll_rows')) {
            return;
        }
        Schema::table('retail_payroll_rows', function (Blueprint $table) {
            $after = 'working_days';
            foreach (self::COLUMNS as $col) {
                if (!Schema::hasColumn('retail_payroll_rows', $col)) {
                    $table->decimal($col, 8, 2)->nullable()->after($after);
                }
                $after = $col;
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('retail_payroll_rows')) {
            return;
        }
        Schema::table('retail_payroll_rows', function (Blueprint $table) {
            foreach (self::COLUMNS as $col) {
                if (Schema::hasColumn('retail_payroll_rows', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
