<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('retail_salary_categories')) {
            Schema::create('retail_salary_categories', function (Blueprint $table) {
                $table->id();
                $table->string('position_type', 20); // seller | manager
                $table->string('category', 5);
                $table->string('label');
                $table->decimal('base_salary', 12, 2)->default(0);
                $table->timestamps();
                $table->unique(['position_type', 'category']);
            });

            $now = now();
            $seed = [
                ['seller', 'A', 'Prodavač - Kategorija A', 1200],
                ['seller', 'B', 'Prodavač - Kategorija B', 1100],
                ['seller', 'C', 'Prodavač - Kategorija C', 1000],
                ['manager', 'A', 'Šef - Kategorija A', 1400],
                ['manager', 'B', 'Šef - Kategorija B', 1300],
                ['manager', 'C', 'Šef - Kategorija C', 1200],
            ];
            foreach ($seed as [$type, $cat, $label, $salary]) {
                DB::table('retail_salary_categories')->insert([
                    'position_type' => $type,
                    'category' => $cat,
                    'label' => $label,
                    'base_salary' => $salary,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (!Schema::hasTable('retail_payroll_imports')) {
            Schema::create('retail_payroll_imports', function (Blueprint $table) {
                $table->id();
                $table->string('file_name')->nullable();
                $table->unsignedSmallInteger('year');
                $table->json('months')->nullable();
                $table->unsignedInteger('rows_count')->default(0);
                $table->unsignedBigInteger('uploaded_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('retail_payroll_rows')) {
            Schema::create('retail_payroll_rows', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('import_id')->nullable()->index();
                $table->unsignedSmallInteger('year');
                $table->unsignedTinyInteger('month');
                $table->unsignedInteger('row_number')->nullable();
                $table->string('store_name');
                $table->unsignedInteger('employees_count')->nullable();
                $table->string('worker_name');
                $table->string('worker_key')->index();
                $table->string('position')->nullable();
                $table->string('position_type', 20)->default('seller');
                $table->string('category', 5)->nullable();
                $table->decimal('plan_worker_ly', 14, 2)->nullable();
                $table->decimal('turnover_worker_ly', 14, 2)->nullable();
                $table->decimal('plan_worker_cy', 14, 2)->nullable();
                $table->decimal('turnover_worker_cy', 14, 2)->nullable();
                $table->decimal('plan_store', 14, 2)->nullable();
                $table->decimal('turnover_store_ly', 14, 2)->nullable();
                $table->decimal('turnover_store_cy', 14, 2)->nullable();
                $table->boolean('has_transport')->default(false);
                $table->decimal('transport_amount', 12, 2)->nullable();
                $table->decimal('working_days', 6, 2)->nullable();
                $table->decimal('net_salary_store_cy', 14, 2)->nullable();
                $table->decimal('net_salary_store_ly', 14, 2)->nullable();
                $table->decimal('net_salary_worker_cy', 14, 2)->nullable();
                $table->decimal('net_salary_worker_ly', 14, 2)->nullable();
                $table->decimal('ruc', 14, 2)->nullable();
                $table->decimal('purchase_value', 14, 2)->nullable();
                $table->decimal('rent', 14, 2)->nullable();
                $table->timestamps();
                $table->index(['year', 'month']);
            });
        }

        if (!Schema::hasTable('retail_payroll_worker_links')) {
            Schema::create('retail_payroll_worker_links', function (Blueprint $table) {
                $table->id();
                $table->string('worker_key')->unique();
                $table->string('worker_name');
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('permissions')) {
            $exists = DB::table('permissions')->where('name', 'planika.maloprodaja.payroll.manage')->exists();
            if (!$exists) {
                DB::table('permissions')->insert([
                    'name' => 'planika.maloprodaja.payroll.manage',
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
                    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('retail_payroll_worker_links');
        Schema::dropIfExists('retail_payroll_rows');
        Schema::dropIfExists('retail_payroll_imports');
        Schema::dropIfExists('retail_salary_categories');
        if (Schema::hasTable('permissions')) {
            DB::table('permissions')->where('name', 'planika.maloprodaja.payroll.manage')->delete();
        }
    }
};
