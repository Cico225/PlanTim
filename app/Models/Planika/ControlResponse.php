<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ControlResponse extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_control_responses';

    protected $fillable = [
        'control_id',
        'section_name',
        'criterion_name',
        'score',
        'response',
        'comment',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    /**
     * Control relationship
     */
    public function control(): BelongsTo
    {
        return $this->belongsTo(StoreControl::class, 'control_id');
    }
}

