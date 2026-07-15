<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('planika_finance_krediti')) {
            Schema::create('planika_finance_krediti', function (Blueprint $table) {
                $table->id();
                $table->string('credit_number', 64)->index();
                $table->string('barcode', 64)->nullable()->index();
                $table->date('issue_date')->nullable();
                $table->string('store_name')->nullable();
                $table->string('company_name')->nullable();
                $table->string('customer_name')->nullable();
                $table->decimal('amount', 14, 2)->nullable();
                $table->string('currency', 8)->default('BAM');
                $table->unsignedSmallInteger('import_year')->nullable();
                $table->unsignedTinyInteger('import_month')->nullable();
                $table->json('additional_data')->nullable();
                $table->boolean('zabrana_verified')->default(false);
                $table->timestamp('zabrana_verified_at')->nullable();
                $table->foreignId('zabrana_verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('registrar_number')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique('credit_number');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_finance_krediti');
    }
};
