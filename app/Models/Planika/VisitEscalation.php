<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitEscalation extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_visit_escalations';

    protected $fillable = [
        'schedule_id',
        'escalated_by',
        'escalation_reason',
        'reason_details',
        'escalation_level',
        'status',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    /**
     * Schedule relationship
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(VisitSchedule::class, 'schedule_id');
    }

    /**
     * Escalated by user relationship
     */
    public function escalatedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'escalated_by');
    }
}

