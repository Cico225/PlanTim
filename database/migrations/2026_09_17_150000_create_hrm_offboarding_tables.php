<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hrm_offboarding_reasons')) {
            Schema::create('hrm_offboarding_reasons', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code', 80)->unique();
                $table->text('description')->nullable();
                $table->boolean('initiated_by_employee')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('hrm_offboarding_checklist_items')) {
            Schema::create('hrm_offboarding_checklist_items', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('category', 100)->default('default');
                $table->unsignedInteger('due_days')->default(0);
                $table->boolean('is_required')->default(false);
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('hrm_offboarding_processes')) {
            Schema::create('hrm_offboarding_processes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hrm_employees')->cascadeOnDelete();
                $table->foreignId('reason_id')->nullable()->constrained('hrm_offboarding_reasons')->nullOnDelete();
                $table->date('notification_date')->nullable();
                $table->date('last_working_day');
                $table->string('status', 30)->default('in_progress');
                $table->unsignedTinyInteger('progress_percentage')->default(0);
                $table->boolean('exit_interview_completed')->default(false);
                $table->text('exit_interview_notes')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['status', 'last_working_day']);
            });
        } else {
            Schema::table('hrm_offboarding_processes', function (Blueprint $table) {
                if (!Schema::hasColumn('hrm_offboarding_processes', 'progress_percentage')) {
                    $table->unsignedTinyInteger('progress_percentage')->default(0)->after('status');
                }
            });
        }

        if (!Schema::hasTable('hrm_offboarding_tasks')) {
            Schema::create('hrm_offboarding_tasks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('process_id')->constrained('hrm_offboarding_processes')->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedInteger('order')->default(0);
                $table->string('category', 100)->default('default');
                $table->date('due_date')->nullable();
                $table->string('status', 30)->default('pending');
                $table->unsignedBigInteger('assigned_to')->nullable();
                $table->unsignedBigInteger('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->index(['process_id', 'status']);
            });
        }

        $this->seedDefaults();
    }

    private function seedDefaults(): void
    {
        $now = now();

        $reasons = [
            ['name' => 'Otkaz od strane zaposlenika', 'code' => 'resignation', 'description' => 'Zaposlenik dao otkaz', 'initiated_by_employee' => 1],
            ['name' => 'Otkaz od strane poslodavca', 'code' => 'termination', 'description' => 'Prekid ugovora od strane poslodavca', 'initiated_by_employee' => 0],
            ['name' => 'Istek ugovora', 'code' => 'contract_expiry', 'description' => 'Ugovor na određeno vrijeme istekao', 'initiated_by_employee' => 0],
            ['name' => 'Sporazumni raskid', 'code' => 'mutual_agreement', 'description' => 'Sporazumni prekid radnog odnosa', 'initiated_by_employee' => 0],
            ['name' => 'Penzionisanje', 'code' => 'retirement', 'description' => 'Odlazak u penziju', 'initiated_by_employee' => 0],
        ];

        foreach ($reasons as $reason) {
            if (!DB::table('hrm_offboarding_reasons')->where('code', $reason['code'])->exists()) {
                DB::table('hrm_offboarding_reasons')->insert(array_merge($reason, [
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }

        $items = [
            ['title' => 'Povrat opreme', 'description' => 'Laptop, telefon, kartica pristupa, uniforma', 'category' => 'equipment', 'due_days' => 0, 'is_required' => 1, 'sort_order' => 1],
            ['title' => 'Deaktivacija pristupa', 'description' => 'Email, ERP, POS, VPN i ostali sistemi', 'category' => 'it_access', 'due_days' => 0, 'is_required' => 1, 'sort_order' => 2],
            ['title' => 'Exit intervju', 'description' => 'Završni razgovor s HR-om', 'category' => 'exit_interview', 'due_days' => 0, 'is_required' => 0, 'sort_order' => 3],
            ['title' => 'Predaja dokumentacije i ključeva', 'description' => 'Ključevi, dokumenti, pristupne kartice', 'category' => 'documents', 'due_days' => 0, 'is_required' => 1, 'sort_order' => 4],
            ['title' => 'Obračun krajnje plate', 'description' => 'Završni obračun plate i beneficija', 'category' => 'payroll', 'due_days' => 7, 'is_required' => 1, 'sort_order' => 5],
            ['title' => 'Arhiviranje dosijea', 'description' => 'Arhiviranje HR dokumentacije zaposlenika', 'category' => 'archive', 'due_days' => 14, 'is_required' => 0, 'sort_order' => 6],
        ];

        if (Schema::hasTable('hrm_offboarding_checklist_items')) {
            foreach ($items as $item) {
                if (!DB::table('hrm_offboarding_checklist_items')->where('title', $item['title'])->exists()) {
                    DB::table('hrm_offboarding_checklist_items')->insert(array_merge($item, [
                        'is_active' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]));
                }
            }
        }
    }

    public function down(): void
    {
        // Do not drop existing production tables on rollback of this alignment migration.
    }
};
