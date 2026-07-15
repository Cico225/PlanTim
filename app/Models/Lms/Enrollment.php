<?php

namespace App\Models\Lms;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $table = 'lms_enrollments';

    protected $fillable = [
        'course_id',
        'user_id',
        'enrolled_at',
        'completed_at',
        'progress',
        'final_score',
        'grade',
        'recommend_retake',
        'min_passing_score',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
        'progress' => 'integer',
        'final_score' => 'decimal:2',
        'recommend_retake' => 'boolean',
        'min_passing_score' => 'integer',
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

    // Helper methods
    public function calculateGrade($score)
    {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 60) return 'D';
        return 'F';
    }

    public function shouldRecommendRetake($score, $minPassing = 70)
    {
        return $score < $minPassing;
    }
}




