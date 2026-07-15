<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivityPlan extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_activity_plans';

    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
        'period_type',
        'plan_type',
        'trigger_criteria',
        'target_regions',
        'target_stores',
        'goals',
        'required_activities',
        'kpi_thresholds',
        'required_controls_per_month',
        'deadlines',
        'priority',
        'status',
        'auto_generate_calendar',
        'auto_balancing',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'target_regions' => 'array',
        'target_stores' => 'array',
        'goals' => 'array',
        'trigger_criteria' => 'array',
        'required_activities' => 'array',
        'kpi_thresholds' => 'array',
        'deadlines' => 'array',
        'auto_generate_calendar' => 'boolean',
    ];

    /**
     * Creator relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Plan assignments
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(PlanAssignment::class, 'plan_id');
    }

    /**
     * Store controls for this plan
     */
    public function controls(): HasMany
    {
        return $this->hasMany(StoreControl::class, 'plan_id');
    }

    /**
     * Visit schedules for this plan
     */
    public function visitSchedules(): HasMany
    {
        return $this->hasMany(VisitSchedule::class, 'plan_id');
    }
}

