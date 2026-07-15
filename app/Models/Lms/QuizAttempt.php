<?php

namespace App\Models\Lms;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizAttempt extends Model
{
    use HasFactory;

    protected $table = 'lms_quiz_attempts';

    protected $fillable = [
        'quiz_id',
        'user_id',
        'attempt_number',
        'score',
        'percentage',
        'grade',
        'passed',
        'answers',
        'question_results',
        'recommend_retake',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'passed' => 'boolean',
        'recommend_retake' => 'boolean',
        'answers' => 'array',
        'question_results' => 'array',
        'score' => 'decimal:2',
        'percentage' => 'decimal:2',
        'attempt_number' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function quiz()
    {
        return $this->belongsTo(Quiz::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function questionAttempts()
    {
        return $this->hasMany(QuizQuestionAttempt::class, 'quiz_attempt_id');
    }

    // Helper methods
    public function calculatePercentage($totalPoints, $earnedPoints)
    {
        if ($totalPoints == 0) return 0;
        return round(($earnedPoints / $totalPoints) * 100, 2);
    }

    public function calculateGrade($percentage)
    {
        if ($percentage >= 90) return 'A';
        if ($percentage >= 80) return 'B';
        if ($percentage >= 70) return 'C';
        if ($percentage >= 60) return 'D';
        return 'F';
    }
}




