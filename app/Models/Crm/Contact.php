<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use App\Models\User;

class Contact extends Model
{
    use SoftDeletes;

    protected $table = 'crm_contacts';

    protected $fillable = [
        'company_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'mobile',
        'position',
        'department',
        'status',
        'is_primary',
        'preferred_communication',
        'avatar',
        'address',
        'city',
        'country',
        'postal_code',
        'birthday',
        'linkedin',
        'notes',
        'owner_id',
        'created_by',
        'last_interaction_date',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'birthday' => 'date',
        'last_interaction_date' => 'datetime',
    ];

    // Relacije
    public function company(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'company_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'contact_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'contact_id');
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'entity', 'entity_type', 'entity_id');
    }

    public function tags()
    {
        return $this->morphToMany(Tag::class, 'entity', 'crm_entity_tags', 'entity_id', 'tag_id')
            ->withPivot('entity_type')
            ->wherePivot('entity_type', 'contact')
            ->withTimestamps();
    }

    // Accessors
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    public function scopeByCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }
}

