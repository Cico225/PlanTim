<?php

namespace App\Models\Lms;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurpriseReward extends Model
{
    use HasFactory;

    protected $table = 'lms_surprise_rewards';

    protected $fillable = [
        'course_id',
        'type',
        'reward_type',
        'title',
        'description',
        'message',
        'points_value',
        'probability',
        'order',
        'is_active',
    ];

    protected $casts = [
        'points_value' => 'integer',
        'probability' => 'decimal:2',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function attempts()
    {
        return $this->hasMany(UserSurpriseAttempt::class, 'reward_id');
    }
}



