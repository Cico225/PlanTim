<?php

namespace App\Models\Lms;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseUserGroup extends Model
{
    use HasFactory;

    protected $table = 'lms_course_user_groups';

    protected $fillable = [
        'course_id',
        'group_type',
        'group_value',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}




