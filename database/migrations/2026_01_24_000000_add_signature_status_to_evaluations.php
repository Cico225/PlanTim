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
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'signature_status')) {
                Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                    $table->enum('signature_status', ['draft', 'evaluator_signed', 'employee_signed', 'completed'])
                        ->default('draft')
                        ->nullable()
                        ->after('status');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'signature_status')) {
                Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                    $table->dropColumn('signature_status');
                });
            }
        }
    }
};





