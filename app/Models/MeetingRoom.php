<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeetingRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'location',
        'description',
        'capacity',
        'equipment',
        'is_active',
    ];

    protected $casts = [
        'equipment' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get all reservations for this room
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(MeetingReservation::class, 'room_id');
    }

    /**
     * Get active reservations
     */
    public function activeReservations(): HasMany
    {
        return $this->reservations()
            ->where('start_time', '>=', now());
    }
}







