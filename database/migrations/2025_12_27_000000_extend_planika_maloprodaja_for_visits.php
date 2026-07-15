<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add store categorization to stores table
        if (Schema::hasTable('planika_maloprodaja_stores')) {
            Schema::table('planika_maloprodaja_stores', function (Blueprint $table) {
                if (!Schema::hasColumn('planika_maloprodaja_stores', 'category')) {
                    $table->enum('category', ['A', 'B', 'C'])->default('B')->after('is_active');
                }
                if (!Schema::hasColumn('planika_maloprodaja_stores', 'categorization_data')) {
                    $table->json('categorization_data')->nullable()->after('category');
                }
                if (!Schema::hasColumn('planika_maloprodaja_stores', 'category_updated_at')) {
                    $table->timestamp('category_updated_at')->nullable()->after('categorization_data');
                }
            });
        }

        // Extend activity plans with plan types
        if (Schema::hasTable('planika_maloprodaja_activity_plans')) {
            Schema::table('planika_maloprodaja_activity_plans', function (Blueprint $table) {
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'plan_type')) {
                    $table->enum('plan_type', ['regular', 'focused', 'emergency', 'seasonal'])->default('regular')->after('period_type');
                }
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'trigger_criteria')) {
                    $table->json('trigger_criteria')->nullable()->after('plan_type');
                }
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'required_activities')) {
                    $table->json('required_activities')->nullable()->after('goals');
                }
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'kpi_thresholds')) {
                    $table->json('kpi_thresholds')->nullable()->after('required_activities');
                }
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'auto_generate_calendar')) {
                    $table->boolean('auto_generate_calendar')->default(true)->after('status');
                }
                if (!Schema::hasColumn('planika_maloprodaja_activity_plans', 'auto_balancing')) {
                    $table->enum('auto_balancing', ['none', 'location', 'time', 'both'])->default('location')->after('auto_generate_calendar');
                }
            });
        }

        // Visit Schedule (Kalendar obilazaka)
        if (!Schema::hasTable('planika_maloprodaja_visit_schedules')) {
            Schema::create('planika_maloprodaja_visit_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('planika_maloprodaja_activity_plans')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
            $table->foreignId('assigned_to')->constrained('users')->cascadeOnDelete(); // Regionalni menadžer
            $table->date('scheduled_date');
            $table->time('scheduled_time')->nullable();
            $table->integer('estimated_duration_minutes')->default(60);
            $table->enum('status', ['planned', 'in_progress', 'completed', 'missed', 'cancelled'])->default('planned');
            $table->integer('visit_order')->nullable(); // Redoslijed u rutu
            $table->json('route_optimization_data')->nullable(); // Podaci za optimizaciju rute
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['plan_id', 'scheduled_date'], 'visit_schedules_plan_date_idx');
            $table->index(['store_id', 'scheduled_date'], 'visit_schedules_store_date_idx');
            $table->index(['assigned_to', 'scheduled_date'], 'visit_schedules_user_date_idx');
            $table->index('status', 'visit_schedules_status_idx');
        });

        // Store Visits (Obilasci prodavnica)
        Schema::create('planika_maloprodaja_store_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->nullable()->constrained('planika_maloprodaja_visit_schedules')->nullOnDelete();
            $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained('planika_maloprodaja_activity_plans')->nullOnDelete();
            $table->foreignId('visited_by')->constrained('users')->cascadeOnDelete(); // Regionalni menadžer
            $table->date('visit_date');
            $table->time('check_in_time')->nullable();
            $table->time('check_out_time')->nullable();
            $table->decimal('check_in_latitude', 10, 8)->nullable();
            $table->decimal('check_in_longitude', 11, 8)->nullable();
            $table->string('check_in_method', 50)->nullable(); // GPS, QR_CODE
            $table->foreignId('control_id')->nullable()->constrained('planika_maloprodaja_store_controls')->nullOnDelete();
            $table->foreignId('store_manager_evaluation_id')->nullable()->constrained('planika_maloprodaja_employee_evaluations')->nullOnDelete();
            $table->json('sample_evaluations')->nullable(); // Uzorak ocjena prodavača
            $table->json('coaching_activities')->nullable(); // Coaching aktivnosti
            $table->json('photos')->nullable(); // Niz fotografija
            $table->text('visit_summary')->nullable();
            $table->enum('visit_quality_score', ['excellent', 'good', 'satisfactory', 'needs_improvement'])->nullable();
            $table->text('meta_control_notes')->nullable(); // Napomene za meta-kontrolu
            $table->timestamps();

            $table->index(['store_id', 'visit_date'], 'store_visits_store_date_idx');
            $table->index(['visited_by', 'visit_date'], 'store_visits_user_date_idx');
            $table->index('visit_date', 'store_visits_date_idx');
            });
        }

        // Visit Reminders (Podsjetnici)
        if (!Schema::hasTable('planika_maloprodaja_visit_reminders')) {
            Schema::create('planika_maloprodaja_visit_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('planika_maloprodaja_visit_schedules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('reminder_time');
            $table->enum('reminder_type', ['before_visit', 'missed_visit', 'escalation'])->default('before_visit');
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'reminder_time'], 'visit_reminders_user_time_idx');
            $table->index('is_sent', 'visit_reminders_sent_idx');
            });
        }

        // Visit Escalations (Eskalacije)
        if (!Schema::hasTable('planika_maloprodaja_visit_escalations')) {
            Schema::create('planika_maloprodaja_visit_escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('planika_maloprodaja_visit_schedules')->cascadeOnDelete();
            $table->foreignId('escalated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('escalation_reason', ['missed_visit', 'multiple_missed', 'low_quality', 'delay'])->default('missed_visit');
            $table->text('reason_details')->nullable();
            $table->enum('escalation_level', ['warning', 'regional_manager', 'director'])->default('warning');
            $table->enum('status', ['pending', 'acknowledged', 'resolved'])->default('pending');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['schedule_id', 'status'], 'visit_escalations_schedule_status_idx');
            $table->index('escalation_level', 'visit_escalations_level_idx');
            });
        }

        // Store Categorization History (Istorija kategorizacije)
        if (!Schema::hasTable('planika_maloprodaja_store_category_history')) {
            Schema::create('planika_maloprodaja_store_category_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('planika_maloprodaja_stores')->cascadeOnDelete();
            $table->enum('category', ['A', 'B', 'C']);
            $table->json('categorization_data')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('changed_at');
            $table->timestamps();

            $table->index(['store_id', 'changed_at'], 'store_category_history_store_changed_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_store_category_history');
        Schema::dropIfExists('planika_maloprodaja_visit_escalations');
        Schema::dropIfExists('planika_maloprodaja_visit_reminders');
        Schema::dropIfExists('planika_maloprodaja_store_visits');
        Schema::dropIfExists('planika_maloprodaja_visit_schedules');

        Schema::table('planika_maloprodaja_activity_plans', function (Blueprint $table) {
            $table->dropColumn([
                'plan_type',
                'trigger_criteria',
                'required_activities',
                'kpi_thresholds',
                'auto_generate_calendar',
                'auto_balancing',
            ]);
        });

        Schema::table('planika_maloprodaja_stores', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'categorization_data',
                'category_updated_at',
            ]);
        });
    }
};

