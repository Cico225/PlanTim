<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ControlForm extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_control_forms';

    protected $fillable = [
        'name',
        'description',
        'sections',
        'scoring_type',
        'max_score',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'sections' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Creator relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Store controls using this form
     */
    public function controls(): HasMany
    {
        return $this->hasMany(StoreControl::class, 'control_form_id');
    }
}

