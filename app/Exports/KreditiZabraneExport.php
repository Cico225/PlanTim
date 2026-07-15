<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class KreditiZabraneExport implements FromCollection, WithHeadings
{
    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     */
    public function __construct(
        protected Collection $rows,
    ) {}

    public function collection(): Collection
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return [
            'Broj dokumenta',
            'Datum',
            'WhsName',
            'Naziv kupca/dobavljača',
            'Naziv kupca/dobavljača',
            'Ukupno',
            'PIO filijala',
            'Status izvora',
            'Status uparivanja',
            'Broj registratora',
            'Datum uparivanja',
            'Upario',
            'Napomena',
        ];
    }
}
