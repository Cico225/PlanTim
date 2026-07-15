<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreVisit extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_store_visits';

    protected $fillable = [
        'schedule_id',
        'store_id',
        'plan_id',
        'visited_by',
        'visit_date',
        'check_in_time',
        'check_out_time',
        'check_in_latitude',
        'check_in_longitude',
        'check_in_method',
        'control_id',
        'store_manager_evaluation_id',
        'sample_evaluations',
        'coaching_activities',
        'photos',
        'visit_summary',
        'visit_quality_score',
        'meta_control_notes',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'sample_evaluations' => 'array',
        'coaching_activities' => 'array',
        'photos' => 'array',
    ];

    /**
     * Schedule relationship
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(VisitSchedule::class, 'schedule_id');
    }

    /**
     * Store relationship
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Plan relationship
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ActivityPlan::class, 'plan_id');
    }

    /**
     * Visitor (regional manager) relationship
     */
    public function visitor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'visited_by');
    }

    /**
     * Control relationship
     */
    public function control(): BelongsTo
    {
        return $this->belongsTo(StoreControl::class, 'control_id');
    }

    /**
     * Store manager evaluation relationship
     */
    public function storeManagerEvaluation(): BelongsTo
    {
        return $this->belongsTo(EmployeeEvaluation::class, 'store_manager_evaluation_id');
    }
}

