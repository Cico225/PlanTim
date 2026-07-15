<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingReservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'created_by',
        'title',
        'description',
        'start_time',
        'end_time',
        'participants',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'participants' => 'array',
    ];

    /**
     * Get the room for this reservation
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(MeetingRoom::class, 'room_id');
    }

    /**
     * Get the user who created this reservation
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if reservation overlaps with another reservation
     */
    public static function hasOverlap(int $roomId, \DateTime $startTime, \DateTime $endTime, ?int $excludeId = null): bool
    {
        $query = self::where('room_id', $roomId)
            ->where(function ($q) use ($startTime, $endTime) {
                // Check if new reservation overlaps with existing ones
                // Overlap occurs if:
                // - new start is between existing start and end
                // - new end is between existing start and end
                // - new reservation completely contains existing reservation
                // - existing reservation completely contains new reservation
                $q->where(function ($subQ) use ($startTime, $endTime) {
                    $subQ->whereBetween('start_time', [$startTime, $endTime])
                        ->orWhereBetween('end_time', [$startTime, $endTime])
                        ->orWhere(function ($innerQ) use ($startTime, $endTime) {
                            $innerQ->where('start_time', '<=', $startTime)
                                ->where('end_time', '>=', $endTime);
                        });
                });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}







