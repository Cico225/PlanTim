<?php

namespace App\Imports;

use App\Models\Planika\FinanceCredit;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCalculatedFormulas;

/**
 * Uvoz kredita — prilagođen Planika exportu (npr. 2026_05.xlsx):
 * Broj dokumenta | Datum | WhsName | Naziv kupca (firma) | Naziv kupca (kupac) | Ukupno | PIO filijala | Status
 */
class KreditiImport implements ToCollection, WithCalculatedFormulas
{
    private const ERR_DUPLICATE = 1;

    private const ERR_MISSING_DATA = 2;

    private const ERR_EMPTY_NUMBER = 3;

    protected array $errors = [];

    protected bool $recognizedSheet = false;

    protected int $skippedSheets = 0;

    /** @var array<int, array<string, mixed>> */
    protected array $importedRows = [];

    /** @var array<string, mixed> */
    protected array $rowContext = [];

    /** @var array<string, int> credit number => row number it was imported from */
    protected array $seenInFile = [];

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

        // Every sheet in the workbook is passed here; sheets without a recognizable header
        // (pivot/summary sheets) are skipped instead of producing incomplete credits.
        if (! $this->detectHeaderAndMap($rows)) {
            $this->skippedSheets++;

            return;
        }
        $this->recognizedSheet = true;

        foreach ($rows as $index => $row) {
            if ($index <= $this->headerRowIndex) {
                continue;
            }

            $rowNumber = $index + 1;
            $rowArray = $row instanceof Collection ? $row->values()->all() : array_values((array) $row);

            if ($this->isEmptyRow($rowArray)) {
                continue;
            }

            $this->rowContext = [];
            try {
                $this->importRowArray($rowArray, $rowNumber);
            } catch (\Throwable $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'row_number' => $rowNumber,
                    'type' => match ($e->getCode()) {
                        self::ERR_DUPLICATE => 'duplicate',
                        self::ERR_MISSING_DATA => 'missing_data',
                        self::ERR_EMPTY_NUMBER => 'empty_number',
                        default => 'other',
                    },
                    'credit_number' => $this->rowContext['credit_number'] ?? null,
                    'customer_name' => $this->rowContext['customer_name'] ?? null,
                    'raw_date' => $this->rowContext['raw_date'] ?? null,
                    'raw_amount' => $this->rowContext['raw_amount'] ?? null,
                    'error' => $e->getMessage(),
                ];
            }
        }
    }

    protected function detectHeaderAndMap(Collection $rows): bool
    {
        $this->columnMap = null;
        $this->headerRowIndex = 0;

        foreach ($rows as $index => $row) {
            $arr = $row instanceof Collection ? $row->values()->all() : array_values((array) $row);
            $map = $this->buildColumnMapFromHeader($arr);
            if ($map !== null) {
                $this->columnMap = $map;
                $this->headerRowIndex = $index;

                return true;
            }
        }

        return false;
    }

    public function hasRecognizedSheet(): bool
    {
        return $this->recognizedSheet;
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

        // Fallback for header variants such as "Datum dokumenta" or "Ukupno KM".
        foreach ($headerRow as $colIndex => $cell) {
            $norm = $this->normalizeHeaderCell((string) $cell);
            if ($norm === '' || in_array($colIndex, $map, true) || in_array($colIndex, $nazivCols, true)) {
                continue;
            }
            if (! isset($map['issue_date']) && str_starts_with($norm, 'datum')
                && ! preg_match('/dospij|isplat|zabran|valut/u', $norm)) {
                $map['issue_date'] = $colIndex;
            } elseif (! isset($map['amount']) && preg_match('/^(ukupno|iznos)/u', $norm)) {
                $map['amount'] = $colIndex;
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
        $rawDate = $this->getMappedCell($row, 'issue_date');
        $rawAmount = $this->getMappedCell($row, 'amount');
        $customerName = $this->cellString($this->getMappedCell($row, 'customer_name'));
        $this->rowContext = [
            'credit_number' => $creditNumber !== '' ? $creditNumber : null,
            'customer_name' => $customerName,
            'raw_date' => $this->describeCell($rawDate),
            'raw_amount' => $this->describeCell($rawAmount),
        ];

        if ($creditNumber === '') {
            throw new \Exception('Broj dokumenta/kredita je prazan.', self::ERR_EMPTY_NUMBER);
        }

        $issueDate = $this->parseDate($rawDate);
        $storeName = $this->cellString($this->getMappedCell($row, 'store_name'));
        $companyName = $this->cellString($this->getMappedCell($row, 'company_name'));
        $amount = $this->parseAmount($rawAmount);

        $missing = [];
        if ($issueDate === null) {
            $missing[] = ! isset($this->columnMap['issue_date'])
                ? 'kolona "Datum" nije pronađena u zaglavlju'
                : 'datum nije prepoznat (vrijednost: "'.$this->describeCell($rawDate).'")';
        }
        if ($amount === null) {
            $missing[] = ! isset($this->columnMap['amount'])
                ? 'kolona "Ukupno" nije pronađena u zaglavlju'
                : 'iznos nije prepoznat (vrijednost: "'.$this->describeCell($rawAmount).'")';
        }
        if ($missing !== []) {
            throw new \Exception("Kredit {$creditNumber} nije uvezen: ".implode('; ', $missing).'.', self::ERR_MISSING_DATA);
        }
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

        if (isset($this->seenInFile[$creditNumber])) {
            throw new \Exception(
                "Kredit {$creditNumber} se ponavlja u fajlu (već uvezen iz reda {$this->seenInFile[$creditNumber]}).",
                self::ERR_DUPLICATE
            );
        }

        $existing = FinanceCredit::query()->where('credit_number', $creditNumber)->first();

        $action = 'created';
        if ($existing) {
            if (! $this->overwrite) {
                throw new \Exception("Kredit {$creditNumber} već postoji u bazi.", self::ERR_DUPLICATE);
            }
            $action = $existing->zabrana_verified ? 'updated_verified' : 'updated';
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
            // Never wipe existing values with empty cells from the new file.
            $payload = array_filter($payload, fn ($v) => $v !== null && $v !== '');
            $existing->update($payload);
        } else {
            FinanceCredit::query()->create(array_merge($payload, [
                'credit_number' => $creditNumber,
                'created_by' => $this->userId,
            ]));
        }

        $this->seenInFile[$creditNumber] = $rowNumber;
        $this->importedRows[] = [
            'row_number' => $rowNumber,
            'credit_number' => $creditNumber,
            'issue_date' => $issueDate,
            'amount' => $amount,
            'store_name' => $storeName,
            'company_name' => $companyName,
            'customer_name' => $customerName,
            'action' => $action,
        ];
        $this->successCount++;
    }

    /** @return array<int, array<string, mixed>> */
    public function getImportedRows(): array
    {
        return $this->importedRows;
    }

    public function getSkippedSheets(): int
    {
        return $this->skippedSheets;
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

    protected function describeCell(mixed $value): string
    {
        if ($value === null) {
            return 'prazno';
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        $s = trim((string) $value);

        return $s === '' ? 'prazno' : mb_substr($s, 0, 40);
    }

    protected function parseDate(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        if ($value === null) {
            return null;
        }

        $s = trim(str_replace("\u{00A0}", ' ', (string) $value));
        if ($s === '' || str_starts_with($s, '=')) {
            return null;
        }

        // Excel serial date (e.g. 46146 or 46146.5)
        if (is_numeric($s) && (float) $s >= 1 && (float) $s < 2958466 && ! preg_match('/^\d{8}$/', $s)) {
            try {
                return Carbon::instance(
                    \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $s)
                )->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        // 20260504
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $s, $m)) {
            return $this->safeDate((int) $m[1], (int) $m[2], (int) $m[3]);
        }

        // 2026-05-04, 2026.05.04, 2026/05/04 (+ optional time)
        if (preg_match('/^(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})\.?(?:[\sT].*)?$/u', $s, $m)) {
            return $this->safeDate((int) $m[1], (int) $m[2], (int) $m[3]);
        }

        // Planika/BiH format: 04.05.26, 4.5.2026., 04/05/2026, 04-05-2026 (+ optional time)
        if (preg_match('/^(\d{1,2})\s*[.\/\-]\s*(\d{1,2})\s*[.\/\-]\s*(\d{2,4})\.?(?:\s.*)?$/u', $s, $m)) {
            $year = (int) $m[3];
            if ($year < 100) {
                $year += $year >= 70 ? 1900 : 2000;
            }

            return $this->safeDate($year, (int) $m[2], (int) $m[1]);
        }

        try {
            return Carbon::parse($s)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    protected function safeDate(int $year, int $month, int $day): ?string
    {
        if ($year < 1900 || $year > 2100 || ! checkdate($month, $day, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    protected function parseAmount(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_int($value) || is_float($value)) {
            return round((float) $value, 2);
        }

        $s = trim((string) $value);
        if ($s === '' || str_starts_with($s, '=')) {
            return null;
        }

        // Strip currency, spaces (incl. non-breaking) and apostrophe thousand separators.
        $s = preg_replace("/[\s\x{00A0}'’]|KM|BAM|EUR|€/iu", '', $s) ?? '';
        $negative = str_starts_with($s, '-') || (str_starts_with($s, '(') && str_ends_with($s, ')'));
        $s = preg_replace('/[^\d.,]/', '', $s) ?? '';
        if ($s === '' || ! preg_match('/\d/', $s)) {
            return null;
        }

        $lastDot = strrpos($s, '.');
        $lastComma = strrpos($s, ',');

        if ($lastDot !== false && $lastComma !== false) {
            // The separator that appears last is the decimal one: 1.234,56 or 1,234.56
            $decimal = $lastDot > $lastComma ? '.' : ',';
            $thousands = $decimal === '.' ? ',' : '.';
            $s = str_replace($thousands, '', $s);
            $s = str_replace($decimal, '.', $s);
        } elseif ($lastComma !== false) {
            // 1,234,567 → thousands; 229,50 → decimal
            $s = substr_count($s, ',') > 1 ? str_replace(',', '', $s) : str_replace(',', '.', $s);
        } elseif ($lastDot !== false && substr_count($s, '.') > 1) {
            // 1.234.567 → thousands
            $s = str_replace('.', '', $s);
        }

        if (! is_numeric($s)) {
            return null;
        }

        $amount = round((float) $s, 2);

        return $negative ? -$amount : $amount;
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
