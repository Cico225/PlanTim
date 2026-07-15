<?php

namespace App\Models\Planika;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationResponse extends Model
{
    use HasFactory;

    protected $table = 'planika_maloprodaja_evaluation_responses';

    protected $fillable = [
        'evaluation_id',
        'criterion_name',
        'score',
        'comment',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    /**
     * Evaluation relationship
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(EmployeeEvaluation::class, 'evaluation_id');
    }
}

