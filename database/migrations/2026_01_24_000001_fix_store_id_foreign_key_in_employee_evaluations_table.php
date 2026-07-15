<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            // Drop the old foreign key constraint if it exists
            $constraintName = 'planika_maloprodaja_employee_evaluations_store_id_foreign';
            
            // Check if constraint exists and drop it
            $constraints = \Illuminate\Support\Facades\DB::select(
                "SELECT CONSTRAINT_NAME 
                 FROM information_schema.KEY_COLUMN_USAGE 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'planika_maloprodaja_employee_evaluations' 
                 AND COLUMN_NAME = 'store_id' 
                 AND CONSTRAINT_NAME != 'PRIMARY'"
            );
            
            if (!empty($constraints)) {
                foreach ($constraints as $constraint) {
                    \Illuminate\Support\Facades\DB::statement(
                        "ALTER TABLE `planika_maloprodaja_employee_evaluations` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`"
                    );
                }
            }
            
            Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                // Add foreign key constraint referencing planika_maloprodaja_stores
                $table->foreign('store_id', 'planika_maloprodaja_employee_evaluations_store_id_foreign')
                    ->references('id')
                    ->on('planika_maloprodaja_stores')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                // Drop the foreign key constraint
                try {
                    $table->dropForeign('planika_maloprodaja_employee_evaluations_store_id_foreign');
                } catch (\Exception $e) {
                    $table->dropForeign(['store_id']);
                }
            });
            
            Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                // Restore foreign key constraint referencing hrm_stores
                $table->foreign('store_id', 'planika_maloprodaja_employee_evaluations_store_id_foreign')
                    ->references('id')
                    ->on('hrm_stores')
                    ->onDelete('cascade');
            });
        }
    }
};

