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
        Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            // Drop the old foreign key constraint using the exact constraint name
            $table->dropForeign('planika_maloprodaja_employee_evaluations_store_id_foreign');
        });
        
        Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            // Add new foreign key constraint referencing hrm_stores
            $table->foreign('store_id', 'planika_maloprodaja_employee_evaluations_store_id_foreign')
                ->references('id')
                ->on('hrm_stores')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
            // Drop the new foreign key constraint
            $table->dropForeign(['store_id']);
            
            // Restore the old foreign key constraint referencing planika_maloprodaja_stores
            $table->foreign('store_id')
                ->references('id')
                ->on('planika_maloprodaja_stores')
                ->onDelete('cascade');
        });
    }
};
