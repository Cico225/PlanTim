<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Region extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_regions';

    protected $fillable = [
        'name',
        'code',
        'description',
        'regional_manager_id',
        'department_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Regional manager relationship
     */
    public function regionalManager(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'regional_manager_id');
    }

    /**
     * Stores in this region
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class, 'region_id');
    }
}

