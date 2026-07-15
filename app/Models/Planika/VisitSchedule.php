<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VisitSchedule extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_visit_schedules';

    protected $fillable = [
        'plan_id',
        'store_id',
        'assigned_to',
        'scheduled_date',
        'scheduled_time',
        'estimated_duration_minutes',
        'status',
        'visit_order',
        'route_optimization_data',
        'notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'scheduled_time' => 'datetime',
        'route_optimization_data' => 'array',
    ];

    /**
     * Plan relationship
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ActivityPlan::class, 'plan_id');
    }

    /**
     * Store relationship
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Assigned user (regional manager) relationship
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_to');
    }

    /**
     * Store visit (completed visit)
     */
    public function visit(): HasOne
    {
        return $this->hasOne(StoreVisit::class, 'schedule_id');
    }

    /**
     * Reminders
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(VisitReminder::class, 'schedule_id');
    }

    /**
     * Escalations
     */
    public function escalations(): HasMany
    {
        return $this->hasMany(VisitEscalation::class, 'schedule_id');
    }
}

