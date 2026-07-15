<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitReminder extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_visit_reminders';

    protected $fillable = [
        'schedule_id',
        'user_id',
        'reminder_time',
        'reminder_type',
        'is_sent',
        'sent_at',
    ];

    protected $casts = [
        'reminder_time' => 'datetime',
        'sent_at' => 'datetime',
        'is_sent' => 'boolean',
    ];

    /**
     * Schedule relationship
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(VisitSchedule::class, 'schedule_id');
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }
}

