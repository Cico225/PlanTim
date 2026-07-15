<?php

namespace App\Models\Lms;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseSurprise extends Model
{
    use HasFactory;

    protected $table = 'lms_course_surprises';

    protected $fillable = [
        'course_id',
        'scratch_card_enabled',
        'scratch_card_after_quiz',
        'scratch_card_cooldown_hours',
        'spin_wheel_enabled',
        'spin_wheel_after_quiz',
        'spin_wheel_cooldown_hours',
        'spin_wheel_segments',
    ];

    protected $casts = [
        'scratch_card_enabled' => 'boolean',
        'scratch_card_after_quiz' => 'boolean',
        'spin_wheel_enabled' => 'boolean',
        'spin_wheel_after_quiz' => 'boolean',
        'scratch_card_cooldown_hours' => 'integer',
        'spin_wheel_cooldown_hours' => 'integer',
        'spin_wheel_segments' => 'integer',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function rewards()
    {
        return $this->hasMany(SurpriseReward::class, 'course_id', 'course_id');
    }
}


