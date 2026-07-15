<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sales Plans (Mjesečni planovi)
        if (!Schema::hasTable('planika_maloprodaja_sales_plans')) {
            Schema::create('planika_maloprodaja_sales_plans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->integer('year');
                $table->integer('month'); // 1-12
                
                // Finansijski plan
                $table->decimal('gross_salary', 15, 2)->nullable(); // Bruto plata
                $table->decimal('net_salary', 15, 2)->nullable(); // Neto plata
                $table->string('currency', 10)->default('BAM');
                
                // Prodajni plan
                $table->integer('planned_shoe_pairs')->default(0); // Plan prodaje pari cipela
                $table->integer('planned_merchandise_pieces')->default(0); // Plan prodaje komadne robe
                $table->decimal('planned_revenue', 15, 2)->nullable(); // Plan prometa (opcionalno)
                $table->string('revenue_currency', 10)->default('BAM');
                
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                
                // Unique constraint: jedan zaposlenik može imati samo jedan plan po mjesecu
                $table->unique(['employee_id', 'year', 'month'], 'sales_plans_emp_year_month_unique');
                $table->index(['year', 'month']);
                $table->index('employee_id');
            });
        }

        // Sales Results (Rezultati - upload iz Excel-a)
        if (!Schema::hasTable('planika_maloprodaja_sales_results')) {
            Schema::create('planika_maloprodaja_sales_results', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('store_id')->nullable()->constrained('hrm_stores')->nullOnDelete();
                $table->integer('year');
                $table->integer('month'); // 1-12
                $table->date('result_date')->nullable(); // Za dnevne zbirne rezultate (opcionalno)
                
                // Rezultati prodaje
                $table->integer('sold_shoe_pairs')->default(0); // Broj prodanih pari cipela
                $table->integer('sold_merchandise_pieces')->default(0); // Broj prodanih komada robe
                $table->decimal('revenue', 15, 2)->nullable(); // Promet (opcionalno)
                $table->string('revenue_currency', 10)->default('BAM');
                
                // Metapodaci za Excel upload
                $table->string('upload_source', 50)->nullable(); // 'excel', 'manual', etc.
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('uploaded_at')->nullable();
                $table->string('upload_file_name')->nullable();
                $table->text('upload_errors')->nullable(); // JSON za greške pri uploadu
                
                $table->text('notes')->nullable();
                $table->timestamps();
                
                // Indexi za brzu pretragu
                $table->index(['employee_id', 'year', 'month']);
                $table->index(['store_id', 'year', 'month']);
                $table->index(['year', 'month']);
                $table->index('result_date');
            });
        }

        // Sales Plan vs Results Summary (Računati automatski, ali možda cache za brži pristup)
        if (!Schema::hasTable('planika_maloprodaja_sales_performance')) {
            Schema::create('planika_maloprodaja_sales_performance', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('plan_id')->nullable()->constrained('planika_maloprodaja_sales_plans')->nullOnDelete();
                $table->integer('year');
                $table->integer('month');
                
                // Planirane vrijednosti (iz plana)
                $table->decimal('planned_gross_salary', 15, 2)->nullable();
                $table->decimal('planned_net_salary', 15, 2)->nullable();
                $table->integer('planned_shoe_pairs')->default(0);
                $table->integer('planned_merchandise_pieces')->default(0);
                $table->decimal('planned_revenue', 15, 2)->nullable();
                
                // Ostvarene vrijednosti (sumirani rezultati)
                $table->integer('actual_shoe_pairs')->default(0);
                $table->integer('actual_merchandise_pieces')->default(0);
                $table->decimal('actual_revenue', 15, 2)->nullable();
                
                // Procenti realizacije
                $table->decimal('shoe_pairs_percentage', 5, 2)->default(0); // % realizacije cipela
                $table->decimal('merchandise_pieces_percentage', 5, 2)->default(0); // % realizacije robe
                $table->decimal('revenue_percentage', 5, 2)->nullable(); // % realizacije prometa
                
                // Bonus indikator
                $table->boolean('bonus_eligible')->default(false); // > 100% realizacije
                $table->decimal('bonus_percentage', 5, 2)->nullable(); // % bonusa (npr. 112.5% - 100% = 12.5%)
                
                $table->timestamps();
                
                // Unique constraint
                $table->unique(['employee_id', 'year', 'month'], 'sales_perf_emp_year_month_unique');
                $table->index(['year', 'month']);
                $table->index('employee_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_sales_performance');
        Schema::dropIfExists('planika_maloprodaja_sales_results');
        Schema::dropIfExists('planika_maloprodaja_sales_plans');
    }
};

