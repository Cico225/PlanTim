<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanAssignment extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_plan_assignments';

    protected $fillable = [
        'plan_id',
        'regional_manager_id',
        'notes',
        'assigned_at',
        'acknowledged_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'acknowledged_at' => 'datetime',
    ];

    /**
     * Plan relationship
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ActivityPlan::class, 'plan_id');
    }

    /**
     * Regional manager relationship
     */
    public function regionalManager(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'regional_manager_id');
    }
}

