<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrm_contract_settings', function (Blueprint $table) {
            $table->string('default_employment_term', 20)->default('indefinite')->after('auto_create_renewal_draft');
            $table->unsignedSmallInteger('default_fixed_months')->default(12)->after('default_employment_term');
            $table->boolean('default_auto_renew')->default(true)->after('default_fixed_months');
            $table->string('default_currency', 10)->default('KM')->after('default_auto_renew');
            $table->boolean('generate_document_by_default')->default(true)->after('default_currency');
            $table->string('contract_number_prefix', 40)->nullable()->after('generate_document_by_default');
            $table->unsignedInteger('contract_number_next')->default(1)->after('contract_number_prefix');
            $table->string('employer_name')->nullable()->after('contract_number_next');
            $table->string('employer_address')->nullable()->after('employer_name');
            $table->string('sign_city', 80)->nullable()->after('employer_address');
            $table->string('director_name')->nullable()->after('sign_city');
            $table->unsignedTinyInteger('weekly_hours')->default(40)->after('director_name');
            $table->unsignedTinyInteger('probation_months')->default(0)->after('weekly_hours');
        });
    }

    public function down(): void
    {
        Schema::table('hrm_contract_settings', function (Blueprint $table) {
            $table->dropColumn([
                'default_employment_term',
                'default_fixed_months',
                'default_auto_renew',
                'default_currency',
                'generate_document_by_default',
                'contract_number_prefix',
                'contract_number_next',
                'employer_name',
                'employer_address',
                'sign_city',
                'director_name',
                'weekly_hours',
                'probation_months',
            ]);
        });
    }
};
