<?php

namespace App\Models\Lms;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Course extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'lms_courses';

    protected $fillable = [
        'title',
        'description',
        'cover_image',
        'video_intro_url',
        'category',
        'level',
        'duration',
        'is_published',
        'is_featured',
        'instructor_id',
        'created_by',
        'attachments',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_featured' => 'boolean',
        'duration' => 'integer',
        'attachments' => 'array',
    ];

    // Relationships
    public function instructor()
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lessons()
    {
        // Check if table exists before trying to access it
        if (!\Illuminate\Support\Facades\Schema::hasTable('lms_lessons')) {
            // Return empty relationship if table doesn't exist
            return $this->hasMany(Lesson::class)->whereRaw('1 = 0');
        }
        return $this->hasMany(Lesson::class)->orderBy('order');
    }

    public function quizzes()
    {
        // Check if table exists before trying to access it
        if (!\Illuminate\Support\Facades\Schema::hasTable('lms_quizzes')) {
            // Return empty relationship if table doesn't exist
            return $this->hasMany(Quiz::class)->whereRaw('1 = 0');
        }
        return $this->hasMany(Quiz::class)->orderBy('order');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function userGroups()
    {
        return $this->hasMany(CourseUserGroup::class);
    }

    public function certificates()
    {
        return $this->hasMany(Certificate::class);
    }

    public function contentViews()
    {
        return $this->hasMany(ContentView::class);
    }

    public function surpriseSettings()
    {
        return $this->hasOne(CourseSurprise::class);
    }

    public function surpriseRewards()
    {
        return $this->hasMany(SurpriseReward::class);
    }

    public function userSurpriseAttempts()
    {
        return $this->hasMany(UserSurpriseAttempt::class);
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }
}


