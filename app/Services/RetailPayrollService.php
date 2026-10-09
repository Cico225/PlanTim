<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class RetailPayrollService
{
    public const MONTHS = [
        1 => 'Januar', 2 => 'Februar', 3 => 'Mart', 4 => 'April', 5 => 'Maj', 6 => 'Juni',
        7 => 'Juli', 8 => 'August', 9 => 'Septembar', 10 => 'Oktobar', 11 => 'Novembar', 12 => 'Decembar',
    ];

    private const MONTH_ALIASES = [
        'januar' => 1, 'jan' => 1, 'januar.' => 1,
        'februar' => 2, 'feb' => 2, 'veljaca' => 2,
        'mart' => 3, 'mar' => 3, 'ozujak' => 3,
        'april' => 4, 'apr' => 4, 'travanj' => 4,
        'maj' => 5, 'svibanj' => 5,
        'juni' => 6, 'jun' => 6, 'lipanj' => 6,
        'juli' => 7, 'jul' => 7, 'srpanj' => 7,
        'august' => 8, 'avgust' => 8, 'aug' => 8, 'kolovoz' => 8,
        'septembar' => 9, 'sep' => 9, 'sept' => 9, 'rujan' => 9,
        'oktobar' => 10, 'okt' => 10, 'listopad' => 10,
        'novembar' => 11, 'nov' => 11, 'studeni' => 11,
        'decembar' => 12, 'dec' => 12, 'prosinac' => 12,
    ];

    /** field => [header aliases (normalized), fallback column index] */
    private const COLUMNS = [
        'store_name' => [['prodavnica'], 0],
        'employees_count' => [['broj zaposlenih'], 1],
        'month' => [['mjesec', 'mesec'], 2],
        'worker_name' => [['radnik', 'ime i prezime', 'uposlenik'], 3],
        'position' => [['pozicija', 'radno mjesto'], 4],
        'category' => [['kategorija'], 5],
        'plan_worker_ly' => [['bruto plan radnika ly'], 6],
        'turnover_worker_ly' => [['bruto promet radnika ly'], 7],
        'plan_worker_cy' => [['bruto plan radnika cy'], 8],
        'turnover_worker_cy' => [['bruto promet radnika cy'], 9],
        'plan_store' => [['bruto plan prodavnice', 'bruto plan prodavnice cy'], 10],
        'turnover_store_ly' => [['bruto promet prodavnice ly'], 11],
        'turnover_store_cy' => [['bruto promet prodavnice cy'], 12],
        'has_transport' => [['prevoz'], 13],
        'transport_amount' => [['iznos prevoza'], 14],
        'working_days' => [['radni dani'], 15],
        'net_salary_store_cy' => [['neto plata cy prodavnica'], 16],
        'net_salary_store_ly' => [['neto plata ly prodavnica'], 17],
        'net_salary_worker_cy' => [['neto plata cy radnik'], 18],
        'net_salary_worker_ly' => [['neto plata ly radnik'], 19],
        'ruc' => [['ruc na nivou prodavnice', 'ruc'], 20],
        'purchase_value' => [['nabavna vrijednost prodate robe', 'nabavna vrijednost'], 21],
        'rent' => [['zakupnine', 'zakupnina'], 22],
    ];

    private const AMOUNT_FIELDS = [
        'plan_worker_ly', 'turnover_worker_ly', 'plan_worker_cy', 'turnover_worker_cy',
        'plan_store', 'turnover_store_ly', 'turnover_store_cy', 'transport_amount', 'working_days',
        'net_salary_store_cy', 'net_salary_store_ly', 'net_salary_worker_cy', 'net_salary_worker_ly',
        'ruc', 'purchase_value', 'rent',
    ];

    public static function normalizeText(?string $value): string
    {
        $s = mb_strtolower(trim((string) $value));
        $s = strtr($s, ['č' => 'c', 'ć' => 'c', 'đ' => 'dj', 'š' => 's', 'ž' => 'z']);
        $s = preg_replace('/[^a-z0-9]+/', ' ', $s);

        return trim(preg_replace('/\s+/', ' ', $s));
    }

    /** Order-independent key so "Ime Prezime" and "Prezime Ime" match. */
    public static function workerKey(string $name): string
    {
        $parts = array_filter(explode(' ', self::normalizeText($name)));
        sort($parts);

        return implode(' ', $parts);
    }

    public static function positionType(?string $position): string
    {
        $p = self::normalizeText($position);

        return preg_match('/\b(sef|poslovodja|voditelj|menadzer)/', $p) ? 'manager' : 'seller';
    }

    /**
     * Parse the payroll Excel file.
     *
     * @return array{rows: array<int, array>, errors: array<int, array>, months: int[]}
     */
    public function parseFile(string $path): array
    {
        $reader = IOFactory::createReaderForFile($path);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($path);

        $rows = [];
        $errors = [];
        $months = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $highestRow = $sheet->getHighestDataRow();
            $highestCol = $sheet->getHighestDataColumn();
            if ($highestRow < 2) {
                continue;
            }
            $data = $sheet->rangeToArray('A1:'.$highestCol.$highestRow, null, true, false);
            $map = $this->mapHeader($data[0] ?? []);
            if ($map === null) {
                continue;
            }

            foreach (array_slice($data, 1, null, true) as $idx => $raw) {
                $rowNumber = $idx + 1;
                $get = fn (string $field) => isset($map[$field]) ? ($raw[$map[$field]] ?? null) : null;

                $worker = trim(preg_replace('/\s+/', ' ', (string) $get('worker_name')));
                $store = trim(preg_replace('/\s+/', ' ', (string) $get('store_name')));
                if ($worker === '' && $store === '') {
                    continue;
                }
                if ($worker === '' || $store === '') {
                    $errors[] = ['row' => $rowNumber, 'sheet' => $sheet->getTitle(), 'message' => 'Nedostaje naziv prodavnice ili ime radnika.'];
                    continue;
                }

                $month = $this->parseMonth($get('month'));
                if ($month === null) {
                    $errors[] = ['row' => $rowNumber, 'sheet' => $sheet->getTitle(), 'worker' => $worker, 'message' => 'Nepoznat mjesec: "'.trim((string) $get('month')).'"'];
                    continue;
                }

                $row = [
                    'row_number' => $rowNumber,
                    'month' => $month,
                    'store_name' => $store,
                    'employees_count' => is_numeric($get('employees_count')) ? (int) $get('employees_count') : null,
                    'worker_name' => $worker,
                    'worker_key' => self::workerKey($worker),
                    'position' => trim((string) $get('position')) ?: null,
                    'position_type' => self::positionType($get('position')),
                    'category' => strtoupper(substr(trim((string) $get('category')), 0, 5)) ?: null,
                    'has_transport' => in_array(self::normalizeText((string) $get('has_transport')), ['da', 'yes', '1', 'x'], true),
                ];

                foreach (self::AMOUNT_FIELDS as $field) {
                    $value = $get($field);
                    $parsed = $this->parseAmount($value);
                    if ($parsed === false) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'sheet' => $sheet->getTitle(),
                            'worker' => $worker,
                            'level' => 'warning',
                            'message' => 'Neispravan iznos u koloni "'.$field.'": "'.$value.'" (postavljeno prazno).',
                        ];
                        $parsed = null;
                    }
                    $row[$field] = $parsed;
                }

                $rows[] = $row;
                $months[$month] = true;
            }
        }

        $monthList = array_keys($months);
        sort($monthList);

        return ['rows' => $rows, 'errors' => $errors, 'months' => $monthList];
    }

    private function mapHeader(array $header): ?array
    {
        $normalized = array_map(fn ($h) => self::normalizeText((string) $h), $header);
        $map = [];
        foreach (self::COLUMNS as $field => [$aliases, $fallback]) {
            foreach ($normalized as $i => $h) {
                if ($h !== '' && in_array($h, $aliases, true)) {
                    $map[$field] = $i;
                    break;
                }
            }
        }

        if (!isset($map['worker_name']) || !isset($map['store_name'])) {
            return null;
        }

        // Unrecognized columns fall back to the standard template position only if that header cell is empty or unknown.
        $used = array_flip($map);
        foreach (self::COLUMNS as $field => [$aliases, $fallback]) {
            if (!isset($map[$field]) && array_key_exists($fallback, $normalized) && !isset($used[$fallback])) {
                $map[$field] = $fallback;
                $used[$fallback] = $field;
            }
        }

        return $map;
    }

    private function parseMonth($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            $n = (float) $value;
            if ($n >= 1 && $n <= 12 && floor($n) == $n) {
                return (int) $n;
            }
            if ($n > 20000) {
                return (int) ExcelDate::excelToDateTimeObject($n)->format('n');
            }

            return null;
        }
        $key = self::normalizeText((string) $value);
        $first = explode(' ', $key)[0] ?? '';

        return self::MONTH_ALIASES[$key] ?? self::MONTH_ALIASES[$first] ?? null;
    }

    /** @return float|null|false false = not parsable */
    private function parseAmount($value)
    {
        if ($value === null) {
            return null;
        }
        if (is_int($value) || is_float($value)) {
            return round((float) $value, 2);
        }
        $s = trim((string) $value);
        if ($s === '' || $s === '-') {
            return null;
        }
        $s = preg_replace('/\s|km|bam/i', '', $s);
        $negative = false;
        if (preg_match('/^\((.*)\)$/', $s, $m)) {
            $negative = true;
            $s = $m[1];
        }
        if (str_starts_with($s, '-')) {
            $negative = true;
            $s = substr($s, 1);
        }
        if (!preg_match('/^[0-9.,]+$/', $s)) {
            return false;
        }

        // The last separator followed by 1-2 digits is the decimal separator; all others are thousands separators.
        if (preg_match('/^(.*)[.,](\d{1,2})$/', $s, $m)) {
            $int = preg_replace('/[.,]/', '', $m[1]);
            $number = (float) (($int === '' ? '0' : $int).'.'.$m[2]);
        } else {
            $number = (float) preg_replace('/[.,]/', '', $s);
        }

        return round($negative ? -$number : $number, 2);
    }

    /**
     * Calculate the salary breakdown for all rows of a period, grouped by worker.
     *
     * @param Collection $rows retail_payroll_rows records (may include user_id from links)
     */
    public function calculate(Collection $rows): array
    {
        $categories = DB::table('retail_salary_categories')->get()
            ->keyBy(fn ($c) => $c->position_type.'|'.strtoupper($c->category));

        $workers = [];
        foreach ($rows->groupBy(fn ($r) => $r->year.'-'.$r->month.'|'.$r->worker_key) as $group) {
            $totalDays = (float) $group->sum(fn ($r) => (float) $r->working_days);
            $totalCy = (float) $group->sum(fn ($r) => max(0, (float) $r->turnover_worker_cy));
            $count = $group->count();
            $first = $group->first();

            $stores = [];
            $totals = [
                'base_salary' => 0.0, 'turnover_salary' => 0.0, 'turnover_difference' => 0.0, 'salary' => 0.0,
                'stimulation' => 0.0, 'total' => 0.0, 'transport' => 0.0, 'total_with_transport' => 0.0,
                'turnover_worker_cy' => 0.0, 'turnover_worker_ly' => 0.0, 'working_days' => $totalDays,
            ];
            $warnings = [];

            foreach ($group as $r) {
                $category = $categories->get($r->position_type.'|'.strtoupper((string) $r->category));
                $fullBase = $category ? (float) $category->base_salary : 0.0;
                if (!$category) {
                    $warnings[] = 'Nepoznata kategorija "'.($r->category ?? '').'" za '.$r->store_name.' - osnovna plata nije obračunata.';
                }

                if ($totalDays > 0) {
                    $share = (float) $r->working_days / $totalDays;
                    $shareBasis = 'days';
                } elseif ($totalCy > 0) {
                    $share = max(0, (float) $r->turnover_worker_cy) / $totalCy;
                    $shareBasis = 'turnover';
                } else {
                    $share = 1 / $count;
                    $shareBasis = 'equal';
                }
                $base = $fullBase * $share;

                $workerLy = (float) $r->turnover_worker_ly;
                $netWorkerLy = (float) $r->net_salary_worker_ly;
                $storeLy = (float) $r->turnover_store_ly;
                $netStoreLy = (float) $r->net_salary_store_ly;
                if ($workerLy > 0 && $netWorkerLy > 0) {
                    $kp = $netWorkerLy / $workerLy;
                    $kpSource = 'worker';
                } elseif ($storeLy > 0 && $netStoreLy > 0) {
                    $kp = $netStoreLy / $storeLy;
                    $kpSource = 'store';
                    $warnings[] = $r->store_name.': nema LY podataka radnika, KP je uzet na nivou prodavnice.';
                } else {
                    $kp = 0.0;
                    $kpSource = 'none';
                    $warnings[] = $r->store_name.': nema LY prometa/neto plate - KP se ne može izračunati, obračunata je samo osnovna plata.';
                }

                $workerCy = max(0, (float) $r->turnover_worker_cy);
                $turnoverSalary = $kp * $workerCy;
                $difference = max(0, $turnoverSalary - $base);
                $salary = $base + $difference;

                $plan = (float) $r->plan_store;
                $storeCy = (float) $r->turnover_store_cy;
                $planMet = $plan > 0 && $storeCy >= $plan;
                $stimulationBase = $planMet ? $storeCy - $plan : 0.0;
                $workerShare = $storeCy > 0 ? $workerCy / $storeCy : 0.0;
                $stimulation = $stimulationBase * $kp * $workerShare;

                $transport = $r->has_transport || (float) $r->transport_amount > 0 ? (float) $r->transport_amount : 0.0;
                $storeTotal = $salary + $stimulation;

                $stores[] = [
                    'row_id' => $r->id,
                    'store_name' => $r->store_name,
                    'position' => $r->position,
                    'position_type' => $r->position_type,
                    'category' => $r->category,
                    'category_label' => $category->label ?? null,
                    'category_salary' => round($fullBase, 2),
                    'working_days' => (float) $r->working_days,
                    'share' => round($share, 6),
                    'share_basis' => $shareBasis,
                    'base_salary' => round($base, 2),
                    'turnover_worker_ly' => $workerLy,
                    'net_salary_worker_ly' => $netWorkerLy,
                    'turnover_worker_cy' => $workerCy,
                    'plan_worker_cy' => (float) $r->plan_worker_cy,
                    'kp' => round($kp, 6),
                    'kp_source' => $kpSource,
                    'turnover_salary' => round($turnoverSalary, 2),
                    'turnover_difference' => round($difference, 2),
                    'salary' => round($salary, 2),
                    'plan_store' => $plan,
                    'turnover_store_cy' => $storeCy,
                    'turnover_store_ly' => $storeLy,
                    'plan_met' => $planMet,
                    'plan_achievement' => $plan > 0 ? round($storeCy / $plan * 100, 2) : null,
                    'stimulation_base' => round($stimulationBase, 2),
                    'worker_share' => round($workerShare, 6),
                    'stimulation' => round($stimulation, 2),
                    'total' => round($storeTotal, 2),
                    'transport' => round($transport, 2),
                ];

                $totals['base_salary'] += $base;
                $totals['turnover_salary'] += $turnoverSalary;
                $totals['turnover_difference'] += $difference;
                $totals['salary'] += $salary;
                $totals['stimulation'] += $stimulation;
                $totals['total'] += $storeTotal;
                $totals['transport'] += $transport;
                $totals['turnover_worker_cy'] += $workerCy;
                $totals['turnover_worker_ly'] += $workerLy;
            }
            $totals['total_with_transport'] = $totals['total'] + $totals['transport'];
            foreach ($totals as $k => $v) {
                $totals[$k] = round($v, 2);
            }

            $workers[] = [
                'worker_key' => $first->worker_key,
                'worker_name' => $first->worker_name,
                'user_id' => $first->user_id ?? null,
                'user_name' => $first->user_name ?? null,
                'year' => (int) $first->year,
                'month' => (int) $first->month,
                'month_label' => self::MONTHS[(int) $first->month] ?? (string) $first->month,
                'stores_count' => count($stores),
                'stores' => $stores,
                'totals' => $totals,
                'warnings' => array_values(array_unique($warnings)),
            ];
        }

        usort($workers, fn ($a, $b) => [$b['year'], $b['month'], $a['worker_name']] <=> [$a['year'], $a['month'], $b['worker_name']]);

        return $workers;
    }
}
