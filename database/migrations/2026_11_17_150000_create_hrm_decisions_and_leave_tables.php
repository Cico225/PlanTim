<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hrm_decision_templates')) {
            $this->extendExistingDecisionsTable();
            $this->ensureSettingsRow();
            return;
        }

        Schema::create('hrm_decision_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('kind', 40)->default('other');
            $table->string('template_file');
            $table->string('output_format', 10)->default('docx');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_decision_settings', function (Blueprint $table) {
            $table->id();
            $table->string('decision_number_prefix', 40)->nullable();
            $table->unsignedInteger('decision_number_next')->default(1);
            $table->unsignedSmallInteger('default_annual_leave_days')->default(20);
            $table->boolean('generate_document_by_default')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_leave_entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedSmallInteger('entitled_days')->default(20);
            $table->unsignedSmallInteger('carried_over_days')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'year']);
        });

        Schema::create('hrm_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('hrm_employment_contracts')->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('hrm_decision_templates')->nullOnDelete();
            $table->string('decision_number', 80)->nullable()->unique();
            $table->string('kind', 40);
            $table->string('title');
            $table->string('status', 20)->default('issued');
            $table->date('decision_date');
            $table->date('effective_date')->nullable();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->unsignedSmallInteger('days')->nullable();
            $table->unsignedSmallInteger('leave_year')->nullable();
            $table->text('notes')->nullable();
            $table->string('generated_document_path')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'kind', 'leave_year']);
            $table->index('status');
        });

        $this->ensureSettingsRow();
        $this->extendExistingDecisionsTable();
    }

    private function ensureSettingsRow(): void
    {
        if (!Schema::hasTable('hrm_decision_settings') || DB::table('hrm_decision_settings')->exists()) {
            return;
        }

        DB::table('hrm_decision_settings')->insert([
            'decision_number_prefix' => 'RJ-',
            'decision_number_next' => 1,
            'default_annual_leave_days' => 20,
            'generate_document_by_default' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function extendExistingDecisionsTable(): void
    {
        if (!Schema::hasTable('hrm_decisions')) {
            return;
        }

        Schema::table('hrm_decisions', function (Blueprint $table) {
            if (!Schema::hasColumn('hrm_decisions', 'contract_id')) {
                $table->unsignedBigInteger('contract_id')->nullable()->after('employee_id');
                $table->foreign('contract_id')->references('id')->on('hrm_employment_contracts')->nullOnDelete();
            }
            if (!Schema::hasColumn('hrm_decisions', 'template_id')) {
                $table->unsignedBigInteger('template_id')->nullable()->after('contract_id');
                $table->foreign('template_id')->references('id')->on('hrm_decision_templates')->nullOnDelete();
            }
            if (!Schema::hasColumn('hrm_decisions', 'kind')) {
                $table->string('kind', 40)->nullable()->after('title');
            }
            if (!Schema::hasColumn('hrm_decisions', 'decision_date')) {
                $table->date('decision_date')->nullable()->after('status');
            }
            if (!Schema::hasColumn('hrm_decisions', 'date_from')) {
                $table->date('date_from')->nullable();
            }
            if (!Schema::hasColumn('hrm_decisions', 'date_to')) {
                $table->date('date_to')->nullable();
            }
            if (!Schema::hasColumn('hrm_decisions', 'days')) {
                $table->unsignedSmallInteger('days')->nullable();
            }
            if (!Schema::hasColumn('hrm_decisions', 'leave_year')) {
                $table->unsignedSmallInteger('leave_year')->nullable();
            }
            if (!Schema::hasColumn('hrm_decisions', 'generated_document_path')) {
                $table->string('generated_document_path')->nullable();
            }
            if (!Schema::hasColumn('hrm_decisions', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable();
            }
        });

        if (Schema::hasColumn('hrm_decisions', 'decision_type_id')) {
            DB::statement('ALTER TABLE hrm_decisions MODIFY decision_type_id BIGINT UNSIGNED NULL');
        }
        if (Schema::hasColumn('hrm_decisions', 'decision_number')) {
            DB::statement('ALTER TABLE hrm_decisions MODIFY decision_number VARCHAR(191) NULL');
        }
        if (Schema::hasColumn('hrm_decisions', 'content')) {
            DB::statement('ALTER TABLE hrm_decisions MODIFY content TEXT NULL');
        }
        if (Schema::hasColumn('hrm_decisions', 'effective_date')) {
            DB::statement('ALTER TABLE hrm_decisions MODIFY effective_date DATE NULL');
        }
        if (Schema::hasColumn('hrm_decisions', 'created_by')) {
            DB::statement('ALTER TABLE hrm_decisions MODIFY created_by BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_decisions');
        Schema::dropIfExists('hrm_leave_entitlements');
        Schema::dropIfExists('hrm_decision_settings');
        Schema::dropIfExists('hrm_decision_templates');
    }
};
