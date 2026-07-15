<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreCategoryHistory extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_store_category_history';

    protected $fillable = [
        'store_id',
        'category',
        'categorization_data',
        'updated_by',
        'changed_at',
    ];

    protected $casts = [
        'categorization_data' => 'array',
        'changed_at' => 'datetime',
    ];

    /**
     * Store relationship
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Updated by user relationship
     */
    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }
}

