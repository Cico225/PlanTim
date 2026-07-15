<?php

namespace App\Models\Planika;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceCredit extends Model
{
    protected $table = 'planika_finance_krediti';

    protected $fillable = [
        'credit_number',
        'barcode',
        'issue_date',
        'store_name',
        'company_name',
        'customer_name',
        'amount',
        'currency',
        'import_year',
        'import_month',
        'additional_data',
        'zabrana_verified',
        'zabrana_verified_at',
        'zabrana_verified_by',
        'registrar_number',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'amount' => 'decimal:2',
        'additional_data' => 'array',
        'zabrana_verified' => 'boolean',
        'zabrana_verified_at' => 'datetime',
        'import_year' => 'integer',
        'import_month' => 'integer',
    ];

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'zabrana_verified_by');
    }

    public function isPaired(): bool
    {
        return $this->zabrana_verified && trim((string) $this->registrar_number) !== '';
    }
}
