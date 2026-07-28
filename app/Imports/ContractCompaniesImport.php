<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;

class ContractCompaniesImport implements ToCollection
{
    protected array $errors = [];

    protected int $successCount = 0;

    protected int $errorCount = 0;

    protected int $updatedCount = 0;

    protected ?array $columnMap = null;

    protected int $headerRowIndex = 0;

    public function __construct(protected int $userId) {}

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
                $this->importRow($rowArray, $rowNumber);
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

        // Fallback: first three columns = name, code, city
        $this->columnMap = ['name' => 0, 'code' => 1, 'city' => 2];
        $this->headerRowIndex = -1;
    }

    protected function buildColumnMapFromHeader(array $header): ?array
    {
        $map = [];
        foreach ($header as $index => $cell) {
            $label = mb_strtolower(trim((string) $cell), 'UTF-8');
            if ($label === '') {
                continue;
            }

            if (preg_match('/naziv|firma|company|name/i', $label) && !isset($map['name'])) {
                $map['name'] = $index;
            } elseif (preg_match('/šifra|sifra|code|id/i', $label) && !isset($map['code'])) {
                $map['code'] = $index;
            } elseif (preg_match('/grad|city|mjesto/i', $label) && !isset($map['city'])) {
                $map['city'] = $index;
            }
        }

        return isset($map['name'], $map['code']) ? $map : null;
    }

    protected function importRow(array $row, int $rowNumber): void
    {
        $name = trim((string) ($row[$this->columnMap['name']] ?? ''));
        $code = trim((string) ($row[$this->columnMap['code']] ?? ''));
        $city = trim((string) ($row[$this->columnMap['city'] ?? -1] ?? ''));

        if ($name === '' || $code === '') {
            throw new \RuntimeException('Naziv i šifra firme su obavezni.');
        }

        $existing = DB::table('planika_finance_contract_companies')->where('code', $code)->first();

        if ($existing) {
            DB::table('planika_finance_contract_companies')->where('id', $existing->id)->update([
                'name' => $name,
                'city' => $city ?: null,
                'updated_at' => now(),
            ]);
            $this->updatedCount++;
        } else {
            DB::table('planika_finance_contract_companies')->insert([
                'name' => $name,
                'code' => $code,
                'city' => $city ?: null,
                'created_by' => $this->userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->successCount++;
        }
    }

    protected function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    public function getUpdatedCount(): int
    {
        return $this->updatedCount;
    }

    public function getErrorCount(): int
    {
        return $this->errorCount;
    }
}
