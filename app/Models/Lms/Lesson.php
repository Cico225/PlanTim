<?php

namespace App\Models\Lms;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    use HasFactory;

    protected $table = 'lms_lessons';

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'content',
        'video_url',
        'image_url',
        'duration',
        'order',
        'is_published',
        'additional_files',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'duration' => 'integer',
        'order' => 'integer',
        'additional_files' => 'array',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function attachments()
    {
        return $this->hasMany(LessonAttachment::class);
    }

    public function progress()
    {
        return $this->hasMany(LessonProgress::class);
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }
}




