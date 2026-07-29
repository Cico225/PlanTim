<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_contract_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 80)->unique();
            $table->string('name');
            $table->enum('legal_entity', ['fbih', 'rs', 'bd']);
            $table->enum('job_role', ['store_manager', 'deputy_manager', 'salesperson']);
            $table->enum('document_kind', ['full_contract', 'annex'])->default('full_contract');
            $table->string('template_file');
            $table->enum('output_format', ['docx', 'pdf'])->default('docx');
            $table->json('placeholder_keys')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_contract_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('default_renewal_notice_days')->default(30);
            $table->boolean('auto_create_renewal_draft')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_employment_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('hrm_stores')->nullOnDelete();
            $table->foreignId('template_id')->constrained('hrm_contract_templates');
            $table->foreignId('parent_contract_id')->nullable()->constrained('hrm_employment_contracts')->nullOnDelete();
            $table->string('contract_number', 80)->nullable();
            $table->string('protocol_number', 80)->nullable();
            $table->enum('legal_entity', ['fbih', 'rs', 'bd']);
            $table->enum('job_role', ['store_manager', 'deputy_manager', 'salesperson']);
            $table->enum('document_kind', ['full_contract', 'annex'])->default('full_contract');
            $table->unsignedSmallInteger('annex_number')->nullable();
            $table->enum('status', ['draft', 'active', 'expired', 'terminated', 'superseded'])->default('draft');
            $table->enum('employment_term', ['indefinite', 'fixed'])->default('indefinite');
            $table->date('contract_sign_date')->nullable();
            $table->date('work_start_date')->nullable();
            $table->date('work_end_date')->nullable();
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->unsignedInteger('renewal_notice_days')->nullable();
            $table->decimal('salary_gross', 12, 2)->nullable();
            $table->decimal('salary_net', 12, 2)->nullable();
            $table->string('currency', 10)->default('KM');
            $table->string('position_title')->nullable();
            $table->string('store_name')->nullable();
            $table->string('store_city')->nullable();
            $table->string('employee_full_name')->nullable();
            $table->string('employee_origin')->nullable();
            $table->string('employee_address')->nullable();
            $table->string('employee_education')->nullable();
            $table->json('custom_fields')->nullable();
            $table->string('generated_document_path')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'expiry_date']);
            $table->index(['store_id', 'legal_entity', 'job_role']);
            $table->index('contract_number');
        });

        Schema::create('hrm_contract_renewals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_contract_id')->constrained('hrm_employment_contracts')->cascadeOnDelete();
            $table->foreignId('new_contract_id')->constrained('hrm_employment_contracts')->cascadeOnDelete();
            $table->date('renewal_end_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('renewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_contract_renewals');
        Schema::dropIfExists('hrm_employment_contracts');
        Schema::dropIfExists('hrm_contract_settings');
        Schema::dropIfExists('hrm_contract_templates');
    }
};
