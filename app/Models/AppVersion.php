<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'version',
        'version_name',
        'changelog',
        'release_notes',
        'is_active',
        'is_latest',
        'released_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_latest' => 'boolean',
        'released_at' => 'datetime',
        'changelog' => 'array',
    ];

    /**
     * Scope to get the current active version
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get the latest version
     */
    public function scopeLatest($query)
    {
        return $query->where('is_latest', true);
    }

    /**
     * Get the current version
     */
    public static function current()
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('app_versions')) {
                return null;
            }
            return static::active()->first();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get the latest version
     */
    public static function getLatest()
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('app_versions')) {
                return null;
            }
            return static::latest()->first();
        } catch (\Exception $e) {
            return null;
        }
    }
}
