<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add department_id to regions
        if (Schema::hasTable('planika_maloprodaja_regions')) {
            Schema::table('planika_maloprodaja_regions', function (Blueprint $table) {
                if (!Schema::hasColumn('planika_maloprodaja_regions', 'department_id')) {
                    $table->foreignId('department_id')->nullable()->after('regional_manager_id')
                        ->constrained('hrm_departments')
                        ->nullOnDelete()
                        ->name('regions_department_fk');
                    $table->index('department_id', 'regions_department_idx');
                }
            });
        }

        // Add department_id to stores
        if (Schema::hasTable('planika_maloprodaja_stores')) {
            Schema::table('planika_maloprodaja_stores', function (Blueprint $table) {
                if (!Schema::hasColumn('planika_maloprodaja_stores', 'department_id')) {
                    $table->foreignId('department_id')->nullable()->after('region_id')
                        ->constrained('hrm_departments')
                        ->nullOnDelete()
                        ->name('stores_department_fk');
                    $table->index('department_id', 'stores_department_idx');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('planika_maloprodaja_stores')) {
            Schema::table('planika_maloprodaja_stores', function (Blueprint $table) {
                if (Schema::hasColumn('planika_maloprodaja_stores', 'department_id')) {
                    $table->dropForeign('stores_department_fk');
                    $table->dropIndex('stores_department_idx');
                    $table->dropColumn('department_id');
                }
            });
        }

        if (Schema::hasTable('planika_maloprodaja_regions')) {
            Schema::table('planika_maloprodaja_regions', function (Blueprint $table) {
                if (Schema::hasColumn('planika_maloprodaja_regions', 'department_id')) {
                    $table->dropForeign('regions_department_fk');
                    $table->dropIndex('regions_department_idx');
                    $table->dropColumn('department_id');
                }
            });
        }
    }
};

