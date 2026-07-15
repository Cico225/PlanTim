<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use App\Models\User;

class Account extends Model
{
    use SoftDeletes;

    protected $table = 'crm_companies';

    protected $fillable = [
        'name',
        'legal_name',
        'type',
        'status',
        'email',
        'phone',
        'website',
        'industry',
        'size',
        'annual_revenue',
        'tax_id',
        'registration_number',
        'address',
        'street',
        'city',
        'country',
        'postal_code',
        'logo',
        'notes',
        'source',
        'rating',
        'owner_id',
        'created_by',
        'last_activity_date',
    ];

    protected $casts = [
        'annual_revenue' => 'decimal:2',
        'last_activity_date' => 'datetime',
    ];

    // Relacije
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'company_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'company_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'company_id');
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'entity', 'entity_type', 'entity_id');
    }

    public function tags()
    {
        return $this->morphToMany(Tag::class, 'entity', 'crm_entity_tags', 'entity_id', 'tag_id')
            ->withPivot('entity_type')
            ->wherePivot('entity_type', 'account')
            ->withTimestamps();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(\App\Models\Project::class, 'client_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByOwner($query, int $userId)
    {
        return $query->where('owner_id', $userId);
    }
}

