<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('planika_finance_contract_companies')) {
            Schema::create('planika_finance_contract_companies', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code', 100);
                $table->string('city')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique('code');
                $table->index('city');
                $table->index('name');
            });
        }

        if (!Schema::hasTable('planika_finance_contract_employee_lists')) {
            Schema::create('planika_finance_contract_employee_lists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('planika_finance_contract_companies')->cascadeOnDelete();
                $table->string('file_path');
                $table->string('file_name');
                $table->enum('file_type', ['image', 'pdf'])->default('pdf');
                $table->string('mime_type')->nullable();
                $table->unsignedBigInteger('file_size')->nullable();
                $table->string('title')->nullable();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('company_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_finance_contract_employee_lists');
        Schema::dropIfExists('planika_finance_contract_companies');
    }
};
