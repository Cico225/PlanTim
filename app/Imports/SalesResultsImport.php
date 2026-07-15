<?php

namespace App\Imports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class SalesResultsImport implements ToCollection, WithHeadingRow
{
    protected $errors = [];
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $userId;
    protected $storeId;
    protected $overwrite;

    public function __construct($userId, $storeId = null, $overwrite = false)
    {
        $this->userId = $userId;
        $this->storeId = $storeId;
        $this->overwrite = $overwrite;
    }

    public function collection(Collection $rows)
    {
        if ($rows->isNotEmpty()) {
            $firstRow = $rows->first();
            Log::info('Sales results import - First row keys', [
                'keys' => array_keys($firstRow->toArray()),
                'first_row' => $firstRow->toArray()
            ]);
        }

        foreach ($rows as $rowIndex => $row) {
            try {
                $this->importResult($row, $rowIndex + 2); // +2 jer je prvi red header, a index počinje od 0
            } catch (\Exception $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'row_number' => $rowIndex + 2,
                    'row' => $row->toArray(),
                    'error' => $e->getMessage()
                ];
                Log::error('Sales results import error', [
                    'row_number' => $rowIndex + 2,
                    'row' => $row->toArray(),
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    protected function importResult($row, $rowNumber)
    {
        // Mapiranje kolona iz Excel-a
        // Možemo očekivati različite nazive kolona
        $employeeId = $this->getEmployeeId($row);
        if (!$employeeId) {
            throw new \Exception('Zaposlenik nije pronađen. Molimo provjerite ID zaposlenika, broj zaposlenika ili ime i prezime.');
        }

        $storeId = $this->getStoreId($row);
        $month = $this->getValue($row, ['mjesec', 'month', 'mjesec_godine']);
        $year = $this->getValue($row, ['godina', 'year', 'godina_mjeseca']);
        $resultDate = $this->getValue($row, ['datum', 'date', 'datum_rezultata', 'result_date']);
        $shoePairs = (int) $this->getValue($row, ['broj_prodanih_parova_cipela', 'broj_prodanih_parova', 'sold_shoe_pairs', 'shoe_pairs', 'parovi_cipela'], 0);
        $merchandisePieces = (int) $this->getValue($row, ['broj_prodanih_komada_robe', 'sold_merchandise_pieces', 'merchandise_pieces', 'komadi_robe'], 0);
        $revenue = $this->getValue($row, ['promet', 'revenue', 'turnover', 'ukupno'], null);

        // Parse month and year
        if (!$month || !$year) {
            // Try to parse from date if provided
            if ($resultDate) {
                try {
                    $date = Carbon::parse($resultDate);
                    $month = $date->month;
                    $year = $date->year;
                } catch (\Exception $e) {
                    // Try to parse as month/year string
                    if (is_string($resultDate) && preg_match('/(\d{1,2})[\/\-](\d{4})/', $resultDate, $matches)) {
                        $month = (int) $matches[1];
                        $year = (int) $matches[2];
                    } else {
                        throw new \Exception('Mjesec i godina su obavezni. Molimo unesite ih ili datum.');
                    }
                }
            } else {
                throw new \Exception('Mjesec i godina su obavezni.');
            }
        }

        // Validate month and year
        if ($month < 1 || $month > 12) {
            throw new \Exception('Mjesec mora biti između 1 i 12.');
        }
        if ($year < 2020 || $year > 2100) {
            throw new \Exception('Godina mora biti između 2020 i 2100.');
        }

        // Parse revenue if provided
        $revenueValue = null;
        if ($revenue) {
            // Remove any non-numeric characters except decimal point and comma
            $revenue = preg_replace('/[^\d.,]/', '', $revenue);
            // Replace comma with dot
            $revenue = str_replace(',', '.', $revenue);
            $revenueValue = floatval($revenue);
        }

        // Prepare result data
        $resultData = [
            'employee_id' => $employeeId,
            'store_id' => $storeId ?? $this->storeId,
            'year' => $year,
            'month' => $month,
            'result_date' => $resultDate ? Carbon::parse($resultDate)->format('Y-m-d') : null,
            'sold_shoe_pairs' => $shoePairs,
            'sold_merchandise_pieces' => $merchandisePieces,
            'revenue' => $revenueValue,
            'revenue_currency' => 'BAM',
            'upload_source' => 'excel',
            'uploaded_by' => $this->userId,
            'uploaded_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // Check if result already exists (for daily results, we can have multiple per month)
        // If overwrite is true, we might want to update or insert
        if ($this->overwrite && $resultDate) {
            // Update existing daily result
            DB::table('planika_maloprodaja_sales_results')
                ->updateOrInsert(
                    [
                        'employee_id' => $employeeId,
                        'year' => $year,
                        'month' => $month,
                        'result_date' => $resultData['result_date'],
                    ],
                    $resultData
                );
        } else {
            // Insert new result
            DB::table('planika_maloprodaja_sales_results')->insert($resultData);
        }

        $this->successCount++;

        // Recalculate performance
        $this->recalculatePerformance($employeeId, $year, $month);
    }

    protected function getEmployeeId($row)
    {
        // Try multiple ways to get employee ID
        // 1. Direct employee_id
        $employeeId = $this->getValue($row, ['employee_id', 'id_zaposlenika', 'id', 'employee']);
        if ($employeeId) {
            $employee = DB::table('hrm_employees')->where('id', $employeeId)->first();
            if ($employee) {
                return $employee->id;
            }
        }

        // 2. Employee number
        $employeeNumber = $this->getValue($row, ['broj_zaposlenika', 'employee_number', 'employee_id_number']);
        if ($employeeNumber) {
            $employee = DB::table('hrm_employees')->where('employee_number', $employeeNumber)->first();
            if ($employee) {
                return $employee->id;
            }
        }

        // 3. Name and surname
        $name = $this->getValue($row, ['ime_prezime', 'ime_i_prezime', 'name', 'employee_name']);
        if ($name) {
            // Try to find by name in users table (joined with hrm_employees)
            $employee = DB::table('hrm_employees')
                ->join('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('users.name', 'like', '%' . $name . '%')
                ->select('hrm_employees.id')
                ->first();
            if ($employee) {
                return $employee->id;
            }

            // Try splitting name and surname
            $nameParts = explode(' ', trim($name), 2);
            if (count($nameParts) >= 1) {
                $firstName = $nameParts[0];
                $lastName = count($nameParts) > 1 ? $nameParts[1] : '';
                
                $query = DB::table('hrm_employees')
                    ->join('users', 'hrm_employees.user_id', '=', 'users.id');
                
                if ($lastName) {
                    $query->where(function($q) use ($firstName, $lastName) {
                        $q->where('users.name', 'like', '%' . $firstName . '%')
                          ->where('users.name', 'like', '%' . $lastName . '%');
                    });
                } else {
                    $query->where('users.name', 'like', '%' . $firstName . '%');
                }
                
                $employee = $query->select('hrm_employees.id')->first();
                if ($employee) {
                    return $employee->id;
                }
            }
        }

        return null;
    }

    protected function getStoreId($row)
    {
        $storeCode = $this->getValue($row, ['prodavnica', 'store', 'store_code', 'sifra_prodavnice']);
        $storeName = $this->getValue($row, ['naziv_prodavnice', 'store_name']);

        if ($storeCode) {
            $store = DB::table('hrm_stores')->where('code', $storeCode)->first();
            if ($store) {
                return $store->id;
            }
        }

        if ($storeName) {
            $store = DB::table('hrm_stores')->where('name', 'like', '%' . $storeName . '%')->first();
            if ($store) {
                return $store->id;
            }
        }

        return $this->storeId;
    }

    protected function getValue($row, $keys, $default = null)
    {
        foreach ($keys as $key) {
            // Try exact key
            if (isset($row[$key])) {
                $value = $row[$key];
                return $value !== null && $value !== '' ? $value : $default;
            }

            // Try normalized key (lowercase, spaces to underscores)
            $normalizedKey = strtolower(str_replace(' ', '_', $key));
            if (isset($row[$normalizedKey])) {
                $value = $row[$normalizedKey];
                return $value !== null && $value !== '' ? $value : $default;
            }

            // Try case-insensitive search
            foreach ($row->keys() as $rowKey) {
                if (strtolower($rowKey) === strtolower($key) || strtolower(str_replace(' ', '_', $rowKey)) === strtolower($normalizedKey)) {
                    $value = $row[$rowKey];
                    return $value !== null && $value !== '' ? $value : $default;
                }
            }
        }

        return $default;
    }

    protected function recalculatePerformance($employeeId, $year, $month)
    {
        // Get plan
        $plan = DB::table('planika_maloprodaja_sales_plans')
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('month', $month)
            ->first();

        // Get aggregated results for the month
        $results = DB::table('planika_maloprodaja_sales_results')
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('month', $month)
            ->selectRaw('
                SUM(sold_shoe_pairs) as total_shoe_pairs,
                SUM(sold_merchandise_pieces) as total_merchandise_pieces,
                SUM(revenue) as total_revenue
            ')
            ->first();

        $performanceData = [
            'employee_id' => $employeeId,
            'year' => $year,
            'month' => $month,
            'plan_id' => $plan ? $plan->id : null,
            'planned_gross_salary' => $plan ? $plan->gross_salary : null,
            'planned_net_salary' => $plan ? $plan->net_salary : null,
            'planned_shoe_pairs' => $plan ? $plan->planned_shoe_pairs : 0,
            'planned_merchandise_pieces' => $plan ? $plan->planned_merchandise_pieces : 0,
            'planned_revenue' => $plan ? $plan->planned_revenue : null,
            'actual_shoe_pairs' => $results->total_shoe_pairs ?? 0,
            'actual_merchandise_pieces' => $results->total_merchandise_pieces ?? 0,
            'actual_revenue' => $results->total_revenue ?? null,
        ];

        // Calculate percentages
        if ($performanceData['planned_shoe_pairs'] > 0) {
            $performanceData['shoe_pairs_percentage'] = ($performanceData['actual_shoe_pairs'] / $performanceData['planned_shoe_pairs']) * 100;
        } else {
            $performanceData['shoe_pairs_percentage'] = 0;
        }

        if ($performanceData['planned_merchandise_pieces'] > 0) {
            $performanceData['merchandise_pieces_percentage'] = ($performanceData['actual_merchandise_pieces'] / $performanceData['planned_merchandise_pieces']) * 100;
        } else {
            $performanceData['merchandise_pieces_percentage'] = 0;
        }

        if ($performanceData['planned_revenue'] && $performanceData['planned_revenue'] > 0) {
            $performanceData['revenue_percentage'] = ($performanceData['actual_revenue'] / $performanceData['planned_revenue']) * 100;
        } else {
            $performanceData['revenue_percentage'] = null;
        }

        // Check bonus eligibility (> 100%)
        $avgPercentage = ($performanceData['shoe_pairs_percentage'] + $performanceData['merchandise_pieces_percentage']) / 2;
        $performanceData['bonus_eligible'] = $avgPercentage > 100;
        
        if ($performanceData['bonus_eligible']) {
            $performanceData['bonus_percentage'] = $avgPercentage - 100;
        } else {
            $performanceData['bonus_percentage'] = null;
        }

        $performanceData['updated_at'] = now();
        $performanceData['created_at'] = now();

        // Upsert performance
        DB::table('planika_maloprodaja_sales_performance')
            ->updateOrInsert(
                [
                    'employee_id' => $employeeId,
                    'year' => $year,
                    'month' => $month,
                ],
                $performanceData
            );
    }

    public function getSuccessCount()
    {
        return $this->successCount;
    }

    public function getErrorCount()
    {
        return $this->errorCount;
    }

    public function getErrors()
    {
        return $this->errors;
    }
}









