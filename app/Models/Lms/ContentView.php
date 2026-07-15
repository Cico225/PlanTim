<?php

namespace App\Models\Lms;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentView extends Model
{
    use HasFactory;

    protected $table = 'lms_content_views';

    protected $fillable = [
        'user_id',
        'course_id',
        'content_type',
        'content_id',
        'view_duration',
        'is_completed',
        'viewed_at',
    ];

    protected $casts = [
        'view_duration' => 'integer',
        'is_completed' => 'boolean',
        'viewed_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}




