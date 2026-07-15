<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationCriteria extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_evaluation_criteria';

    protected $fillable = [
        'name',
        'employee_type',
        'criteria',
        'rating_type',
        'max_rating',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'criteria' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Creator relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Evaluations using this criteria
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(EmployeeEvaluation::class, 'evaluation_criteria_id');
    }
}

