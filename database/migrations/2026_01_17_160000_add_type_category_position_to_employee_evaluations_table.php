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
        // Make evaluation_criteria_id nullable first (if foreign key exists, drop it)
        if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'evaluation_criteria_id')) {
            // Note: Foreign key modification requires dropping and recreating, 
            // which is complex. For now, we'll leave it as is and handle null values in code.
        }

        Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'type')) {
                $table->string('type', 50)->nullable()->after('status'); // 'manager', 'sales_staff'
            }
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'category')) {
                $table->string('category', 1)->nullable()->after('type'); // 'A', 'B', 'C'
            }
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'position')) {
                $table->string('position', 255)->nullable()->after('category');
            }
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'comments')) {
                $table->json('comments')->nullable()->after('scores');
            }
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'evaluator_name')) {
                $table->string('evaluator_name', 255)->nullable()->after('evaluator_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'position')) {
                $table->dropColumn('position');
            }
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'comments')) {
                $table->dropColumn('comments');
            }
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'evaluator_name')) {
                $table->dropColumn('evaluator_name');
            }
        });
    }
};

