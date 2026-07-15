<?php

namespace App\Imports;

use App\Models\Planika\FinanceCredit;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;

/**
 * Uvoz kredita — prilagođen Planika exportu (npr. 2026_05.xlsx):
 * Broj dokumenta | Datum | WhsName | Naziv kupca (firma) | Naziv kupca (kupac) | Ukupno | PIO filijala | Status
 */
class KreditiImport implements ToCollection
{
    protected array $errors = [];

    protected int $successCount = 0;

    protected int $errorCount = 0;

    /** @var array<string, int>|null */
    protected ?array $columnMap = null;

    protected int $headerRowIndex = 0;

    public function __construct(
        protected int $userId,
        protected int $importYear,
        protected int $importMonth,
        protected bool $overwrite = false,
    ) {}

    public function collection(Collection $rows): void
    {
        if ($rows->isEmpty()) {
            return;
        }

        $this->detectHeaderAndMap($rows);

        foreach ($rows as $index => $row) {
            if ($index <= $this->headerRowIndex) {
                continue;
            }

            $rowNumber = $index + 1;
            $rowArray = $row instanceof Collection ? $row->values()->all() : array_values((array) $row);

            if ($this->isEmptyRow($rowArray)) {
                continue;
            }

            try {
                $this->importRowArray($rowArray, $rowNumber);
            } catch (\Throwable $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'row_number' => $rowNumber,
                    'error' => $e->getMessage(),
                ];
            }
        }
    }

    protected function detectHeaderAndMap(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $arr = $row instanceof Collection ? $row->values()->all() : array_values((array) $row);
            $map = $this->buildColumnMapFromHeader($arr);
            if ($map !== null) {
                $this->columnMap = $map;
                $this->headerRowIndex = $index;

                return;
            }
        }

        throw new \Exception('Zaglavlje nije prepoznato. Očekivane kolone: Broj dokumenta, Datum, WhsName, Naziv kupca/dobavljača, Ukupno.');
    }

    /**
     * @param array<int, mixed> $headerRow
     * @return array<string, int>|null
     */
    protected function buildColumnMapFromHeader(array $headerRow): ?array
    {
        $map = [];
        $nazivCols = [];

        foreach ($headerRow as $colIndex => $cell) {
            $norm = $this->normalizeHeaderCell((string) $cell);
            if ($norm === '') {
                continue;
            }

            if (in_array($norm, ['broj_dokumenta', 'broj dokumenta', 'broj_kredita', 'broj kredita', 'credit_number'], true)) {
                $map['credit_number'] = $colIndex;
            } elseif (in_array($norm, ['datum', 'datum_izdavanja', 'datum izdavanja', 'issue_date'], true)) {
                $map['issue_date'] = $colIndex;
            } elseif (in_array($norm, ['whsname', 'prodavnica', 'store', 'store_name'], true)) {
                $map['store_name'] = $colIndex;
            } elseif (str_contains($norm, 'naziv_kupca') || str_contains($norm, 'naziv kupca')
                || in_array($norm, ['firma', 'company', 'company_name', 'poslodavac'], true)) {
                $nazivCols[] = $colIndex;
            } elseif (in_array($norm, ['ukupno', 'iznos', 'iznos_kredita', 'amount', 'suma'], true)) {
                $map['amount'] = $colIndex;
            } elseif (in_array($norm, ['pio_filijala', 'pio filijala'], true)) {
                $map['pio_filijala'] = $colIndex;
            } elseif ($norm === 'status') {
                $map['status'] = $colIndex;
            } elseif (in_array($norm, ['ime_i_prezime', 'ime i prezime', 'kupac', 'customer_name'], true)) {
                $map['customer_name'] = $colIndex;
            } elseif (in_array($norm, ['barkod', 'barcode'], true)) {
                $map['barcode'] = $colIndex;
            }
        }

        if (isset($nazivCols[0])) {
            $map['company_name'] = $nazivCols[0];
        }
        if (isset($nazivCols[1])) {
            $map['customer_name'] = $nazivCols[1];
        } elseif (isset($nazivCols[0]) && ! isset($map['customer_name'])) {
            // Jedna kolona "naziv" — tretiraj kao kupac ako nema posebne firme
            $map['customer_name'] = $nazivCols[0];
            unset($map['company_name']);
        }

        if (! isset($map['credit_number'])) {
            return null;
        }

        return $map;
    }

    /**
     * @param array<int, mixed> $row
     */
    protected function importRowArray(array $row, int $rowNumber): void
    {
        $map = $this->columnMap ?? [];

        $creditNumber = trim((string) ($row[$map['credit_number']] ?? ''));
        if ($creditNumber === '') {
            throw new \Exception('Broj dokumenta/kredita je prazan.');
        }

        $issueDate = $this->parseDate($this->getMappedCell($row, 'issue_date'));
        $storeName = $this->cellString($this->getMappedCell($row, 'store_name'));
        $companyName = $this->cellString($this->getMappedCell($row, 'company_name'));
        $customerName = $this->cellString($this->getMappedCell($row, 'customer_name'));
        $amount = $this->parseAmount($this->getMappedCell($row, 'amount'));
        $barcode = $this->cellString($this->getMappedCell($row, 'barcode')) ?: $creditNumber;
        $pioFilijala = $this->cellString($this->getMappedCell($row, 'pio_filijala'));
        $status = $this->cellString($this->getMappedCell($row, 'status'));

        $additional = array_filter([
            'pio_filijala' => $pioFilijala,
            'status_izvora' => $status,
            'izvor_datoteka' => 'planika_export',
        ], fn ($v) => $v !== null && $v !== '');

        $payload = [
            'barcode' => $barcode,
            'issue_date' => $issueDate,
            'store_name' => $storeName,
            'company_name' => $companyName,
            'customer_name' => $customerName,
            'amount' => $amount,
            'currency' => 'BAM',
            'import_year' => $this->importYear,
            'import_month' => $this->importMonth,
            'additional_data' => $additional !== [] ? $additional : null,
            'updated_by' => $this->userId,
        ];

        $existing = FinanceCredit::query()->where('credit_number', $creditNumber)->first();

        if ($existing) {
            if (! $this->overwrite) {
                throw new \Exception("Kredit {$creditNumber} već postoji u bazi.");
            }
            if ($existing->zabrana_verified) {
                unset(
                    $payload['barcode'],
                    $payload['issue_date'],
                    $payload['store_name'],
                    $payload['company_name'],
                    $payload['customer_name'],
                    $payload['amount']
                );
            }
            $existing->update($payload);
        } else {
            FinanceCredit::query()->create(array_merge($payload, [
                'credit_number' => $creditNumber,
                'created_by' => $this->userId,
            ]));
        }

        $this->successCount++;
    }

    /**
     * @param array<int, mixed> $row
     */
    protected function getMappedCell(array $row, string $field): mixed
    {
        $colIndex = $this->columnMap[$field] ?? null;
        if ($colIndex === null) {
            return null;
        }

        return $row[$colIndex] ?? null;
    }

    /**
     * @param array<int, mixed> $row
     */
    protected function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    protected function cellString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    protected function normalizeHeaderCell(string $cell): string
    {
        $k = mb_strtolower(trim($cell), 'UTF-8');
        $k = str_replace(['/', '\\'], ' ', $k);
        $k = preg_replace('/\s+/', ' ', $k) ?? $k;

        return str_replace(' ', '_', $k);
    }

    protected function parseDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        if (is_numeric($value)) {
            try {
                return Carbon::instance(
                    \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value)
                )->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        $s = trim((string) $value);

        // Planika format: 04.05.26 (dan.mjesec.godina)
        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/', $s, $m)) {
            $day = (int) $m[1];
            $month = (int) $m[2];
            $year = (int) $m[3];
            if ($year < 100) {
                $year += $year >= 70 ? 1900 : 2000;
            }

            try {
                return Carbon::createFromDate($year, $month, $day)->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse($s)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    protected function parseAmount(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        if (is_numeric($value)) {
            return round((float) $value, 2);
        }
        $cleaned = preg_replace('/[^\d.,\-]/', '', (string) $value);
        $cleaned = str_replace(',', '.', $cleaned ?? '');

        return $cleaned !== '' ? round((float) $cleaned, 2) : null;
    }

    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    public function getErrorCount(): int
    {
        return $this->errorCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
