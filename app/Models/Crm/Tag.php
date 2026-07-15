<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Tag extends Model
{
    protected $table = 'crm_tags';

    protected $fillable = [
        'name',
        'color',
        'module',
    ];

    // Relacije
    public function accounts()
    {
        return $this->morphedByMany(Account::class, 'entity', 'crm_entity_tags', 'tag_id', 'entity_id')
            ->wherePivot('entity_type', 'account')
            ->withTimestamps();
    }

    public function contacts()
    {
        return $this->morphedByMany(Contact::class, 'entity', 'crm_entity_tags', 'tag_id', 'entity_id')
            ->wherePivot('entity_type', 'contact')
            ->withTimestamps();
    }

    public function deals()
    {
        return $this->morphedByMany(Deal::class, 'entity', 'crm_entity_tags', 'tag_id', 'entity_id')
            ->wherePivot('entity_type', 'deal')
            ->withTimestamps();
    }
}

