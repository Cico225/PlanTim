<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DealStage extends Model
{
    protected $table = 'crm_deal_stages';

    protected $fillable = [
        'pipeline_id',
        'name',
        'stage_key',
        'sort_order',
        'default_probability',
        'color',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'default_probability' => 'integer',
    ];

    // Relacije
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class, 'pipeline_id');
    }
}






















