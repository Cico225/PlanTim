<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Document extends Model
{
    use SoftDeletes;

    protected $table = 'crm_documents';

    protected $fillable = [
        'name',
        'file_path',
        'file_type',
        'mime_type',
        'file_size',
        'entity_type',
        'entity_id',
        'version',
        'status',
        'uploaded_by',
        'uploaded_at',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'version' => 'integer',
        'uploaded_at' => 'datetime',
    ];

    // Relacije
    public function entity(): MorphTo
    {
        return $this->morphTo('entity');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // Scopes
    public function scopeByEntity($query, string $entityType, int $entityId)
    {
        return $query->where('entity_type', $entityType)
            ->where('entity_id', $entityId);
    }

    public function scopeByType($query, string $fileType)
    {
        return $query->where('file_type', $fileType);
    }
}

