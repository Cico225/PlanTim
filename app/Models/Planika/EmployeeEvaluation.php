<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeEvaluation extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_employee_evaluations';

    protected $fillable = [
        'employee_id',
        'store_id',
        'evaluator_id',
        'evaluation_criteria_id',
        'evaluation_date',
        'period_start',
        'period_end',
        'scores',
        'average_score',
        'rating',
        'overall_comment',
        'recommendations',
        'status',
        'signature_status',
        'acknowledged_at',
    ];

    protected $casts = [
        'evaluation_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'scores' => 'array',
        'average_score' => 'decimal:2',
        'recommendations' => 'array',
        'acknowledged_at' => 'datetime',
    ];

    // Note: Employee relationship will be handled via DB queries in controller
    // since HRM module uses DB facade instead of Eloquent models

    /**
     * Store relationship
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Evaluator (regional manager) relationship
     */
    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'evaluator_id');
    }

    /**
     * Evaluation criteria relationship
     */
    public function criteria(): BelongsTo
    {
        return $this->belongsTo(EvaluationCriteria::class, 'evaluation_criteria_id');
    }

    /**
     * Evaluation responses
     */
    public function responses(): HasMany
    {
        return $this->hasMany(EvaluationResponse::class, 'evaluation_id');
    }
}

