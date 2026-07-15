<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreControl extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_store_controls';

    protected $fillable = [
        'store_id',
        'plan_id',
        'control_form_id',
        'controlled_by',
        'control_date',
        'scores',
        'total_score',
        'percentage_score',
        'overall_comment',
        'recommendations',
        'corrective_measures',
        'status',
    ];

    protected $casts = [
        'control_date' => 'date',
        'scores' => 'array',
        'total_score' => 'decimal:2',
        'percentage_score' => 'decimal:2',
        'recommendations' => 'array',
        'corrective_measures' => 'array',
    ];

    /**
     * Store relationship
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Plan relationship
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ActivityPlan::class, 'plan_id');
    }

    /**
     * Control form relationship
     */
    public function controlForm(): BelongsTo
    {
        return $this->belongsTo(ControlForm::class, 'control_form_id');
    }

    /**
     * Controller (regional manager) relationship
     */
    public function controller(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'controlled_by');
    }

    /**
     * Control responses
     */
    public function responses(): HasMany
    {
        return $this->hasMany(ControlResponse::class, 'control_id');
    }
}

