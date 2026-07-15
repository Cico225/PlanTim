<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_stores';

    protected $fillable = [
        'name',
        'code',
        'region_id',
        'store_manager_id',
        'department_id',
        'address',
        'city',
        'phone',
        'email',
        'opening_hours',
        'is_active',
        'category',
        'categorization_data',
        'category_updated_at',
    ];

    protected $casts = [
        'opening_hours' => 'array',
        'is_active' => 'boolean',
        'categorization_data' => 'array',
        'category_updated_at' => 'datetime',
    ];

    /**
     * Region relationship
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    /**
     * Store manager relationship
     */
    public function storeManager(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'store_manager_id');
    }

    /**
     * Department relationship - using DB facade since HRM uses DB queries
     */
    public function getDepartmentAttribute()
    {
        if ($this->department_id) {
            return \Illuminate\Support\Facades\DB::table('hrm_departments')->find($this->department_id);
        }
        return null;
    }

    /**
     * Store controls
     */
    public function controls(): HasMany
    {
        return $this->hasMany(StoreControl::class, 'store_id');
    }

    /**
     * Employee evaluations for this store
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(EmployeeEvaluation::class, 'store_id');
    }

    /**
     * Visit schedules for this store
     */
    public function visitSchedules(): HasMany
    {
        return $this->hasMany(VisitSchedule::class, 'store_id');
    }

    /**
     * Store visits
     */
    public function visits(): HasMany
    {
        return $this->hasMany(StoreVisit::class, 'store_id');
    }

    /**
     * Category history
     */
    public function categoryHistory(): HasMany
    {
        return $this->hasMany(StoreCategoryHistory::class, 'store_id');
    }
}

