<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('retail_payroll_rows')) {
            Schema::table('retail_payroll_rows', function (Blueprint $table) {
                if (!Schema::hasColumn('retail_payroll_rows', 'contract_salary')) {
                    $table->decimal('contract_salary', 12, 2)->nullable()->after('category');
                }
                if (!Schema::hasColumn('retail_payroll_rows', 'meal_allowance')) {
                    $table->decimal('meal_allowance', 12, 2)->nullable()->after('transport_amount');
                }
            });
        }

        if (Schema::hasTable('retail_salary_categories')) {
            foreach (DB::table('retail_salary_categories')->get() as $c) {
                $label = str_replace(' - Kategorija ', ' - dodatak kategorije ', $c->label);
                if ($label !== $c->label) {
                    DB::table('retail_salary_categories')->where('id', $c->id)->update(['label' => $label]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('retail_payroll_rows')) {
            Schema::table('retail_payroll_rows', function (Blueprint $table) {
                foreach (['contract_salary', 'meal_allowance'] as $col) {
                    if (Schema::hasColumn('retail_payroll_rows', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
