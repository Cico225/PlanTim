<?php

namespace App\Models\Lms;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class UserSurpriseAttempt extends Model
{
    use HasFactory;

    protected $table = 'lms_user_surprise_attempts';

    protected $fillable = [
        'course_id',
        'user_id',
        'quiz_id',
        'surprise_type',
        'reward_id',
        'status',
        'metadata',
        'completed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class);
    }

    public function reward()
    {
        return $this->belongsTo(SurpriseReward::class, 'reward_id');
    }
}



