<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use App\Models\User;
use App\Models\Project;

class Deal extends Model
{
    use SoftDeletes;

    protected $table = 'crm_deals';

    protected $fillable = [
        'title',
        'company_id',
        'contact_id',
        'value',
        'currency',
        'estimated_revenue',
        'stage',
        'pipeline',
        'probability',
        'expected_close_date',
        'actual_close_date',
        'lost_reason',
        'source',
        'campaign_id',
        'description',
        'owner_id',
        'created_by',
        'project_id',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'estimated_revenue' => 'decimal:2',
        'probability' => 'integer',
        'expected_close_date' => 'date',
        'actual_close_date' => 'date',
    ];

    // Relacije
    public function company(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'company_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'deal_id');
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'entity', 'entity_type', 'entity_id');
    }

    public function tags()
    {
        return $this->morphToMany(Tag::class, 'entity', 'crm_entity_tags', 'entity_id', 'tag_id')
            ->withPivot('entity_type')
            ->wherePivot('entity_type', 'deal')
            ->withTimestamps();
    }

    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\Task::class, 'crm_deal_tasks', 'deal_id', 'task_id')
            ->withPivot('task_type')
            ->withTimestamps();
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'crm_deal_projects', 'deal_id', 'project_id')
            ->withTimestamps();
    }

    // Accessors
    public function getEstimatedRevenueAttribute($value)
    {
        if ($value === null && $this->value && $this->probability) {
            return $this->value * ($this->probability / 100);
        }
        return $value;
    }

    // Scopes
    public function scopeByStage($query, string $stage)
    {
        return $query->where('stage', $stage);
    }

    public function scopeByPipeline($query, string $pipeline)
    {
        return $query->where('pipeline', $pipeline);
    }

    public function scopeOpen($query)
    {
        return $query->whereNotIn('stage', ['closed-won', 'closed-lost']);
    }

    public function scopeWon($query)
    {
        return $query->where('stage', 'closed-won');
    }

    public function scopeByOwner($query, int $userId)
    {
        return $query->where('owner_id', $userId);
    }

    // Events
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($deal) {
            // Automatski izračunaj estimated_revenue
            if ($deal->value && $deal->probability) {
                $deal->estimated_revenue = $deal->value * ($deal->probability / 100);
            }
        });

        static::updated(function ($deal) {
            // Ako je deal zatvoren kao won, kreiraj projekt ako ne postoji
            if ($deal->stage === 'closed-won' && !$deal->project_id) {
                // Ovo će se pozvati kroz workflow
            }
        });
    }
}

