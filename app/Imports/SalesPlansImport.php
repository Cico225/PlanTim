<?php

namespace App\Imports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class SalesPlansImport implements ToCollection
{
    protected $errors = [];
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $userId;
    protected $overwrite;
    protected $monthNames = [
        'januar' => 1, 'februar' => 2, 'mart' => 3, 'april' => 4,
        'maj' => 5, 'juni' => 6, 'juli' => 7, 'august' => 8,
        'septembar' => 9, 'oktobar' => 10, 'novembar' => 11, 'decembar' => 12
    ];

    public function __construct($userId, $overwrite = false)
    {
        $this->userId = $userId;
        $this->overwrite = $overwrite;
    }

    public function collection(Collection $rows)
    {
        if ($rows->isEmpty()) {
            return;
        }

        // Detektuj header red - može biti prvi ili drugi red
        // Proveri da li prvi red izgleda kao header (sadrži "PRODAVNICA", "prodavnica", itd.)
        $headerRow = null;
        $headerRowIndex = null;
        $dataRows = collect();
        
        foreach ($rows as $rowIndex => $row) {
            // Konvertuj u array ako je Collection
            $rowArray = $row instanceof Collection ? $row->toArray() : (array) $row;
            
            // Proveri da li je ovo header red
            if ($headerRow === null) {
                // Proveri da li prvi red sadrži header ključne reči
                $firstCell = mb_strtolower(trim((string)($rowArray[0] ?? '')), 'UTF-8');
                $secondCell = mb_strtolower(trim((string)($rowArray[1] ?? '')), 'UTF-8');
                
                $isHeader = false;
                if (in_array($firstCell, ['prodavnica', 'store', 'store_name', 'naziv_prodavnice']) ||
                    in_array($secondCell, ['šifra prodavnice', 'sifra_prodavnice', 'store_code', 'code', 'šifra', 'sifra']) ||
                    strpos($firstCell, 'prodavnica') !== false ||
                    strpos($secondCell, 'šifra') !== false ||
                    strpos($secondCell, 'sifra') !== false) {
                    $isHeader = true;
                }
                
                if ($isHeader) {
                    $headerRow = $rowArray;
                    $headerRowIndex = $rowIndex;
                    continue;
                }
            }
            
            // Ako header nije pronađen u prvom redu, proveri drugi red
            if ($headerRow === null && $rowIndex === 1) {
                // Proveri da li drugi red izgleda kao header
                $firstCell = mb_strtolower(trim((string)($rowArray[0] ?? '')), 'UTF-8');
                $secondCell = mb_strtolower(trim((string)($rowArray[1] ?? '')), 'UTF-8');
                
                $isHeader = false;
                if (in_array($firstCell, ['prodavnica', 'store', 'store_name', 'naziv_prodavnice']) ||
                    in_array($secondCell, ['šifra prodavnice', 'sifra_prodavnice', 'store_code', 'code', 'šifra', 'sifra']) ||
                    strpos($firstCell, 'prodavnica') !== false ||
                    strpos($secondCell, 'šifra') !== false ||
                    strpos($secondCell, 'sifra') !== false) {
                    $isHeader = true;
                }
                
                if ($isHeader) {
                    $headerRow = $rowArray;
                    $headerRowIndex = $rowIndex;
                    continue;
                }
            }
            
            // Ako header već postoji, svi ostali redovi su podaci
            if ($headerRow !== null && $rowIndex > $headerRowIndex) {
                $dataRows->push([
                    'row_index' => $rowIndex + 1, // +1 jer Excel redovi počinju od 1
                    'data' => $rowArray
                ]);
            }
        }

        if (!$headerRow) {
            throw new \Exception('Header red nije pronađen u Excel fajlu.');
        }

        // Mapiranje kolona iz header reda
        $columnMap = [];
        $columnMap['months'] = [];
        
        // Debug: Loguj header red
        Log::info('Header red za mapiranje kolona', [
            'header_row' => $headerRow,
            'header_count' => count($headerRow)
        ]);
        
        // Prvo mapiraj osnovne kolone
        foreach ($headerRow as $colIndex => $headerName) {
            $headerLower = mb_strtolower(trim($headerName ?? ''), 'UTF-8');
            
            if (empty($headerLower)) {
                continue;
            }
            
            if (in_array($headerLower, ['prodavnica', 'store', 'store_name', 'naziv_prodavnice'])) {
                $columnMap['store_name'] = $colIndex;
                Log::info('Pronađena kolona: Prodavnica', ['index' => $colIndex, 'value' => $headerName]);
            } elseif (in_array($headerLower, ['šifra prodavnice', 'sifra_prodavnice', 'store_code', 'code', 'šifra', 'sifra'])) {
                $columnMap['store_code'] = $colIndex;
                Log::info('Pronađena kolona: Šifra prodavnice', ['index' => $colIndex, 'value' => $headerName]);
            } elseif (in_array($headerLower, ['broj radnika', 'number_of_employees', 'num_employees', 'broj_zaposlenih', 'broj radnika u prodavnici'])) {
                $columnMap['num_employees'] = $colIndex;
                Log::info('Pronađena kolona: Broj radnika', ['index' => $colIndex, 'value' => $headerName]);
            } elseif (in_array($headerLower, ['entitet', 'entity'])) {
                $columnMap['entity'] = $colIndex;
                Log::info('Pronađena kolona: Entitet', ['index' => $colIndex, 'value' => $headerName]);
            }
        }
        
        // Sada mapiraj mesečne blokove - traži kolone "MJESEC" i mapira kolone koje slede
        $columnMap['month_blocks'] = [];
        foreach ($headerRow as $colIndex => $headerName) {
            $headerLower = mb_strtolower(trim($headerName ?? ''), 'UTF-8');
            
            if ($headerLower === 'mjesec' || $headerLower === 'mesec') {
                // Pronađi kolone koje slede nakon "MJESEC"
                $planPariIndex = null;
                $planKomIndex = null;
                $netoPlanIndex = null;
                $brutoPlanIndex = null;
                $poslovodaPlanIndex = null;
                $radnikPlanIndex = null;
                
                // Proveri sledeće kolone (do 7 kolona nakon MJESEC)
                for ($i = 1; $i <= 7; $i++) {
                    $nextColIndex = $colIndex + $i;
                    if (!isset($headerRow[$nextColIndex])) {
                        break;
                    }
                    
                    $nextHeaderLower = mb_strtolower(trim($headerRow[$nextColIndex] ?? ''), 'UTF-8');
                    
                    if (in_array($nextHeaderLower, ['plan pari', 'plan_par', 'plan_par_obuće'])) {
                        $planPariIndex = $nextColIndex;
                    } elseif (in_array($nextHeaderLower, ['plan kom', 'plan_kom', 'plan_komadne_robe'])) {
                        $planKomIndex = $nextColIndex;
                    } elseif (in_array($nextHeaderLower, ['neto plan', 'neto_plan', 'neto'])) {
                        $netoPlanIndex = $nextColIndex;
                    } elseif (in_array($nextHeaderLower, ['bruto plan', 'bruto_plan', 'bruto'])) {
                        $brutoPlanIndex = $nextColIndex;
                    } elseif (in_array($nextHeaderLower, ['poslovođa plan', 'poslovoda plan', 'poslovoda_plan', 'menadžer plan', 'menadzer plan'])) {
                        $poslovodaPlanIndex = $nextColIndex;
                    } elseif (in_array($nextHeaderLower, ['radnik plan', 'radnik_plan', 'prodavac plan'])) {
                        $radnikPlanIndex = $nextColIndex;
                    }
                }
                
                // Sačuvaj blok - mesec će biti određen iz podataka
                $columnMap['month_blocks'][] = [
                    'mjesec_index' => $colIndex,
                    'plan_pari_index' => $planPariIndex,
                    'plan_kom_index' => $planKomIndex,
                    'neto_plan_index' => $netoPlanIndex,
                    'bruto_plan_index' => $brutoPlanIndex,
                    'poslovoda_plan_index' => $poslovodaPlanIndex,
                    'radnik_plan_index' => $radnikPlanIndex,
                ];
                
                Log::info('Pronađen mesečni blok', [
                    'mjesec_index' => $colIndex,
                    'plan_pari_index' => $planPariIndex,
                    'plan_kom_index' => $planKomIndex,
                    'neto_plan_index' => $netoPlanIndex,
                    'bruto_plan_index' => $brutoPlanIndex,
                ]);
            }
        }
        
        // Debug: Loguj finalnu mapu kolona
        Log::info('Finalna mapa kolona', [
            'column_map' => $columnMap,
            'months_found' => count($columnMap['months'] ?? [])
        ]);

        // Procesiraj svaki red podataka
        $processedRows = 0;
        foreach ($dataRows as $rowData) {
            try {
                $this->importStorePlans($rowData['data'], $rowData['row_index'], $columnMap);
                $processedRows++;
            } catch (\Exception $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'row_number' => $rowData['row_index'],
                    'row' => $rowData['data'],
                    'error' => $e->getMessage()
                ];
                Log::error('Sales plans import error', [
                    'row_number' => $rowData['row_index'],
                    'row' => $rowData['data'],
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // Loguj rezultate importa
        Log::info('Sales plans import završen', [
            'total_rows' => count($dataRows),
            'processed_rows' => $processedRows,
            'success_count' => $this->successCount,
            'error_count' => $this->errorCount,
            'total_plans_created' => $this->successCount
        ]);
    }

    protected function importStorePlans($rowData, $rowNumber, $columnMap)
    {
        // Izvuci podatke iz reda koristeći mapu kolona
        // $rowData je array sa numeričkim indeksima (0, 1, 2, 3, "januar", "februar", ...)
        $storeName = null;
        $storeCode = null;
        $numEmployees = 1;

        // Debug: Loguj podatke reda i mapu kolona
        Log::debug('ImportStorePlans - podaci reda', [
            'row_number' => $rowNumber,
            'row_data_first_5' => array_slice($rowData, 0, 5),
            'column_map' => $columnMap
        ]);

        if (isset($columnMap['store_name']) && isset($rowData[$columnMap['store_name']])) {
            $storeName = trim((string)$rowData[$columnMap['store_name']]);
        }
        
        if (isset($columnMap['store_code']) && isset($rowData[$columnMap['store_code']])) {
            $storeCode = trim((string)$rowData[$columnMap['store_code']]);
        }
        
        if (isset($columnMap['num_employees']) && isset($rowData[$columnMap['num_employees']])) {
            $numEmployees = (int) $rowData[$columnMap['num_employees']];
        }

        // Debug: Loguj izvučene vrednosti
        Log::debug('ImportStorePlans - izvučene vrednosti', [
            'row_number' => $rowNumber,
            'store_name' => $storeName,
            'store_code' => $storeCode,
            'num_employees' => $numEmployees,
            'store_name_index' => $columnMap['store_name'] ?? null,
            'store_code_index' => $columnMap['store_code'] ?? null,
            'num_employees_index' => $columnMap['num_employees'] ?? null
        ]);

        // Validacija obaveznih polja
        if (!$storeName && !$storeCode) {
            throw new \Exception('Prodavnica je obavezna. Molimo unesite naziv ili šifru prodavnice.');
        }

        if ($numEmployees < 1) {
            throw new \Exception('Broj radnika mora biti veći od 0.');
        }

        // Pronađi prodavnicu - prvo u planika_maloprodaja_stores, zatim u hrm_stores
        $store = null;
        
        // Pokušaj prvo u planika_maloprodaja_stores
        if ($storeCode) {
            $store = DB::table('planika_maloprodaja_stores')->where('code', $storeCode)->first();
        }
        if (!$store && $storeName) {
            $store = DB::table('planika_maloprodaja_stores')
                ->where(function($query) use ($storeName) {
                    $query->where('name', $storeName)
                          ->orWhere('name', 'like', '%' . $storeName . '%');
                })
                ->first();
        }
        
        // Ako nije pronađena, pokušaj u hrm_stores
        if (!$store && $storeCode) {
            $store = DB::table('hrm_stores')->where('code', $storeCode)->first();
        }
        if (!$store && $storeName) {
            $store = DB::table('hrm_stores')
                ->where(function($query) use ($storeName) {
                    $query->where('name', $storeName)
                          ->orWhere('name', 'like', '%' . $storeName . '%');
                })
                ->first();
        }

        // Ako prodavnica ne postoji, kreiraj je u planika_maloprodaja_stores
        if (!$store) {
            // Pronađi default region ili kreiraj ga ako ne postoji
            $defaultRegion = DB::table('planika_maloprodaja_regions')
                ->where('code', 'DEFAULT')
                ->orWhere('name', 'like', '%Default%')
                ->first();
            
            if (!$defaultRegion) {
                // Kreiraj default region
                $defaultRegionId = DB::table('planika_maloprodaja_regions')->insertGetId([
                    'name' => 'Default Region',
                    'code' => 'DEFAULT',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $defaultRegion = (object)['id' => $defaultRegionId];
            }
            
            // Kreiraj prodavnicu
            $storeId = DB::table('planika_maloprodaja_stores')->insertGetId([
                'name' => $storeName ?: 'Prodavnica ' . $storeCode,
                'code' => $storeCode ?: 'STORE_' . time(),
                'region_id' => $defaultRegion->id,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $store = DB::table('planika_maloprodaja_stores')->find($storeId);
            
            Log::info('Kreirana nova prodavnica tokom importa', [
                'store_id' => $storeId,
                'name' => $storeName,
                'code' => $storeCode
            ]);
        }

        // Pronađi sve zaposlenike u toj prodavnici
        // Pokušaj prvo sa tačnim nazivom/kodom, zatim sa delimičnim poklapanjem
        $storeNameForSearch = $store->name ?? $storeName;
        $storeCodeForSearch = $store->code ?? $storeCode;
        
        $employees = DB::table('hrm_employees')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where(function($query) use ($storeNameForSearch, $storeCodeForSearch) {
                // Tačno poklapanje
                if ($storeNameForSearch) {
                    $query->where('hrm_employees.store', $storeNameForSearch);
                }
                if ($storeCodeForSearch && $storeCodeForSearch != $storeNameForSearch) {
                    $query->orWhere('hrm_employees.store', $storeCodeForSearch);
                }
                // Delimično poklapanje
                if ($storeNameForSearch) {
                    $query->orWhere('hrm_employees.store', 'like', '%' . $storeNameForSearch . '%');
                }
            })
            ->where('hrm_employees.status', 'active')
            ->select('hrm_employees.id', 'hrm_employees.position', 'users.name', 'hrm_employees.store')
            ->get();

        if ($employees->isEmpty()) {
            // Ako nema zaposlenika, kreiraj placeholder zaposlenike na osnovu broja radnika iz Excel-a
            // Ovo je privremeno rešenje dok se zaposlenici ne dodaju u sistem
            Log::warning('Nema aktivnih zaposlenika u prodavnici - kreiram placeholder zaposlenike', [
                'store_name' => $storeNameForSearch,
                'store_code' => $storeCodeForSearch,
                'store_id' => $store->id ?? null,
                'num_employees' => $numEmployees
            ]);
            
            // Kreiraj placeholder zaposlenike - optimizovano sa batch insert-om
            $employees = collect();
            
            // Pripremi podatke za batch insert
            $usersToInsert = [];
            $employeesToInsert = [];
            $existingUserIds = [];
            $existingEmployeeIds = [];
            
            // Proveri postojeće korisnike i zaposlenike
            for ($i = 1; $i <= $numEmployees; $i++) {
                $userEmail = strtolower(str_replace([' ', '-', '_'], '', $storeCodeForSearch)) . '_radnik' . $i . '@placeholder.local';
                $employeeNumber = $storeCodeForSearch . '_EMP' . $i;
                
                $existingUser = DB::table('users')->where('email', $userEmail)->first();
                $existingEmployee = DB::table('hrm_employees')->where('employee_id', $employeeNumber)->first();
                
                if ($existingUser) {
                    $existingUserIds[$i] = $existingUser->id;
                }
                if ($existingEmployee) {
                    $existingEmployeeIds[$i] = $existingEmployee->id;
                }
            }
            
            // Kreiraj korisnike koji ne postoje (batch insert)
            $defaultPassword = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password" hash
            $now = now();
            
            for ($i = 1; $i <= $numEmployees; $i++) {
                if (!isset($existingUserIds[$i])) {
                    $userEmail = strtolower(str_replace([' ', '-', '_'], '', $storeCodeForSearch)) . '_radnik' . $i . '@placeholder.local';
                    $userName = $storeNameForSearch . ' - Radnik ' . $i;
                    
                    $usersToInsert[] = [
                        'name' => $userName,
                        'email' => $userEmail,
                        'password' => $defaultPassword, // Pre-hash-ovana lozinka za brzinu
                        'email_verified_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
            
            // Batch insert korisnika
            if (!empty($usersToInsert)) {
                DB::table('users')->insert($usersToInsert);
            }
            
            // Učitaj sve kreirane korisnike
            $createdUsers = DB::table('users')
                ->whereIn('email', array_column($usersToInsert, 'email'))
                ->get()
                ->keyBy('email');
            
            // Kreiraj zaposlenike
            for ($i = 1; $i <= $numEmployees; $i++) {
                $userEmail = strtolower(str_replace([' ', '-', '_'], '', $storeCodeForSearch)) . '_radnik' . $i . '@placeholder.local';
                $employeeNumber = $storeCodeForSearch . '_EMP' . $i;
                $userName = $storeNameForSearch . ' - Radnik ' . $i;
                
                // Pronađi user_id
                $userId = null;
                if (isset($existingUserIds[$i])) {
                    $userId = $existingUserIds[$i];
                } elseif (isset($createdUsers[$userEmail])) {
                    $userId = $createdUsers[$userEmail]->id;
                } else {
                    // Fallback - pokušaj da pronađeš ponovo
                    $user = DB::table('users')->where('email', $userEmail)->first();
                    if ($user) {
                        $userId = $user->id;
                    } else {
                        continue; // Preskoči ako ne može da se kreira korisnik
                    }
                }
                
                // Proveri da li zaposlenik već postoji
                if (isset($existingEmployeeIds[$i])) {
                    $employeeId = $existingEmployeeIds[$i];
                    // Ažuriraj store ako je prazan
                    $existingEmployee = DB::table('hrm_employees')->find($employeeId);
                    if ($existingEmployee && empty($existingEmployee->store)) {
                        DB::table('hrm_employees')
                            ->where('id', $employeeId)
                            ->update(['store' => $storeNameForSearch]);
                    }
                } else {
                    // Kreiraj zaposlenika
                    try {
                        $employeeId = DB::table('hrm_employees')->insertGetId([
                            'user_id' => $userId,
                            'employee_id' => $employeeNumber,
                            'position' => $i === 1 ? 'Menadžer' : 'Prodavac',
                            'store' => $storeNameForSearch,
                            'status' => 'active',
                            'hire_date' => now()->subYear()->format('Y-m-d'),
                            'employment_type' => 'full_time',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    } catch (\Exception $empException) {
                        Log::error('Greška pri kreiranju placeholder zaposlenika', [
                            'error' => $empException->getMessage(),
                            'store' => $storeNameForSearch,
                            'employee_id' => $employeeNumber
                        ]);
                        // Pokušaj da pronađeš postojećeg
                        $existingEmployee = DB::table('hrm_employees')
                            ->where('employee_id', $employeeNumber)
                            ->first();
                        if ($existingEmployee) {
                            $employeeId = $existingEmployee->id;
                        } else {
                            continue; // Preskoči ovog zaposlenika
                        }
                    }
                }
                
                $employees->push((object)[
                    'id' => $employeeId,
                    'position' => $i === 1 ? 'Menadžer' : 'Prodavac',
                    'name' => $userName,
                    'store' => $storeNameForSearch
                ]);
            }
            
            Log::info('Kreirani placeholder zaposlenici za prodavnicu', [
                'store_name' => $storeNameForSearch,
                'num_created' => $employees->count()
            ]);
        }

        // Identifikuj menadžera
        $manager = null;
        $regularEmployees = collect();
        
        foreach ($employees as $emp) {
            $positionLower = mb_strtolower($emp->position ?? '', 'UTF-8');
            if (strpos($positionLower, 'menadžer') !== false || 
                strpos($positionLower, 'manager') !== false || 
                strpos($positionLower, 'voditelj') !== false ||
                strpos($positionLower, 'šef') !== false) {
                $manager = $emp;
            } else {
                $regularEmployees->push($emp);
            }
        }

        // Ako nema eksplicitnog menadžera, uzmi prvog zaposlenika kao menadžera
        if (!$manager && $employees->count() > 0) {
            $manager = $employees->first();
            $regularEmployees = $employees->filter(function($emp) use ($manager) {
                return $emp->id !== $manager->id;
            });
        }

        // Procesiraj planove za sve mesece
        $currentYear = (int) date('Y');
        
        // Debug: Loguj mapu kolona
        if (!isset($columnMap['month_blocks']) || !is_array($columnMap['month_blocks']) || empty($columnMap['month_blocks'])) {
            Log::warning('Nema mesečnih blokova u mapi', [
                'store_name' => $store->name ?? $storeName,
                'column_map' => $columnMap
            ]);
        } else {
            Log::info('Pronađeni mesečni blokovi', [
                'store_name' => $store->name ?? $storeName,
                'blocks_found' => count($columnMap['month_blocks'])
            ]);
        }
        
        if (isset($columnMap['month_blocks']) && is_array($columnMap['month_blocks']) && !empty($columnMap['month_blocks'])) {
            $plansCreatedForStore = 0;
            
            foreach ($columnMap['month_blocks'] as $block) {
                // Pročitaj naziv meseca iz kolone "MJESEC"
                $monthNameInData = null;
                if (isset($block['mjesec_index']) && isset($rowData[$block['mjesec_index']])) {
                    $monthNameInData = mb_strtoupper(trim((string)$rowData[$block['mjesec_index']]), 'UTF-8');
                }
                
                if (!$monthNameInData) {
                    continue;
                }
                
                // Konvertuj naziv meseca u broj meseca
                $monthNumber = null;
                $monthNameLower = mb_strtolower($monthNameInData, 'UTF-8');
                
                // Proveri da li je to validan naziv meseca
                if (isset($this->monthNames[$monthNameLower])) {
                    $monthNumber = $this->monthNames[$monthNameLower];
                } else {
                    // Pokušaj sa alternativnim nazivima
                    $monthAliases = [
                        'januar' => 1, 'january' => 1, 'jan' => 1,
                        'februar' => 2, 'february' => 2, 'feb' => 2,
                        'mart' => 3, 'march' => 3, 'mar' => 3,
                        'april' => 4, 'apr' => 4,
                        'maj' => 5, 'may' => 5,
                        'juni' => 6, 'june' => 6, 'jun' => 6,
                        'juli' => 7, 'july' => 7, 'jul' => 7,
                        'august' => 8, 'aug' => 8,
                        'septembar' => 9, 'september' => 9, 'sep' => 9,
                        'oktobar' => 10, 'october' => 10, 'oct' => 10,
                        'novembar' => 11, 'november' => 11, 'nov' => 11,
                        'decembar' => 12, 'december' => 12, 'dec' => 12,
                    ];
                    
                    if (isset($monthAliases[$monthNameLower])) {
                        $monthNumber = $monthAliases[$monthNameLower];
                    }
                }
                
                if (!$monthNumber) {
                    Log::warning('Nepoznat naziv meseca', [
                        'month_name' => $monthNameInData,
                        'row_number' => $rowNumber
                    ]);
                    continue;
                }
                
                // Pročitaj planove iz kolona
                $revenueValue = null;
                $shoePairs = 0;
                $merchandisePieces = 0;
                
                // Pročitaj NETO PLAN ili BRUTO PLAN (prioritet NETO)
                if (isset($block['neto_plan_index']) && isset($rowData[$block['neto_plan_index']])) {
                    $revenueValue = $this->parseNumericValue($rowData[$block['neto_plan_index']]);
                } elseif (isset($block['bruto_plan_index']) && isset($rowData[$block['bruto_plan_index']])) {
                    $revenueValue = $this->parseNumericValue($rowData[$block['bruto_plan_index']]);
                }
                
                // Pročitaj PLAN PARI
                if (isset($block['plan_pari_index']) && isset($rowData[$block['plan_pari_index']])) {
                    $shoePairs = (int) $this->parseNumericValue($rowData[$block['plan_pari_index']]);
                }
                
                // Pročitaj PLAN KOM
                if (isset($block['plan_kom_index']) && isset($rowData[$block['plan_kom_index']])) {
                    $merchandisePieces = (int) $this->parseNumericValue($rowData[$block['plan_kom_index']]);
                }
                
                // Ako nema revenue vrednosti, preskoči
                if ($revenueValue === null || $revenueValue <= 0) {
                    continue;
                }

                // Kreiraj planove za ovaj mesec
                $plansBefore = $this->successCount;
                $this->createMonthlyPlans($manager, $regularEmployees, $currentYear, $monthNumber, $revenueValue, $shoePairs, $merchandisePieces);
                $plansAfter = $this->successCount;
                $plansCreated = $plansAfter - $plansBefore;
                $plansCreatedForStore += $plansCreated;
                
                if ($plansCreated > 0) {
                    Log::info('Kreirani planovi za mesec', [
                        'store_name' => $store->name ?? $storeName,
                        'year' => $currentYear,
                        'month' => $monthNumber,
                        'month_name' => $monthNameInData,
                        'revenue_value' => $revenueValue,
                        'shoe_pairs' => $shoePairs,
                        'merchandise_pieces' => $merchandisePieces,
                        'plans_created' => $plansCreated
                    ]);
                }
            }
            
            if ($plansCreatedForStore > 0) {
                Log::info('Ukupno kreiranih planova za prodavnicu', [
                    'store_name' => $store->name ?? $storeName,
                    'total_plans' => $plansCreatedForStore
                ]);
            }
        }
        
        // Loguj rezultate obrade prodavnice
        $storeDisplayName = $store->name ?? $storeName ?? 'Nepoznata prodavnica';
        Log::info('Završena obrada prodavnice', [
            'store_name' => $storeDisplayName,
            'store_code' => $store->code ?? $storeCode,
            'row_number' => $rowNumber
        ]);
    }

    protected function parseNumericValue($value)
    {
        if ($value === null || $value === '' || $value === 0) {
            return 0;
        }
        
        if (is_numeric($value)) {
            return floatval($value);
        }
        
        $cleaned = preg_replace('/[^\d.,]/', '', (string)$value);
        $cleaned = str_replace(',', '.', $cleaned);
        return floatval($cleaned);
    }

    protected function createMonthlyPlans($manager, $regularEmployees, $year, $month, $revenueValue, $shoePairs = 0, $merchandisePieces = 0)
    {
        $totalEmployees = ($manager ? 1 : 0) + $regularEmployees->count();
        if ($totalEmployees === 0) {
            return;
        }

        $managerPlanMultiplier = 0.85; // Menadžer ima 85% plana (15% manje)
        $regularPlanDivisor = $totalEmployees - 0.15;
        
        $regularRevenuePlan = $revenueValue ? ($revenueValue / $regularPlanDivisor) : null;
        $regularShoePairsPlan = $shoePairs > 0 ? (int) round($shoePairs / $regularPlanDivisor) : 0;
        $regularMerchandisePlan = $merchandisePieces > 0 ? (int) round($merchandisePieces / $regularPlanDivisor) : 0;

        $managerRevenuePlan = $regularRevenuePlan ? ($regularRevenuePlan * $managerPlanMultiplier) : null;
        $managerShoePairsPlan = (int) round($regularShoePairsPlan * $managerPlanMultiplier);
        $managerMerchandisePlan = (int) round($regularMerchandisePlan * $managerPlanMultiplier);

        // Plan za menadžera
        if ($manager) {
            $planData = [
                'employee_id' => $manager->id,
                'year' => $year,
                'month' => $month,
                'planned_revenue' => $managerRevenuePlan,
                'revenue_currency' => 'BAM',
                'planned_shoe_pairs' => $managerShoePairsPlan,
                'planned_merchandise_pieces' => $managerMerchandisePlan,
                'created_by' => $this->userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($this->overwrite) {
                DB::table('planika_maloprodaja_sales_plans')
                    ->updateOrInsert(
                        [
                            'employee_id' => $manager->id,
                            'year' => $year,
                            'month' => $month,
                        ],
                        $planData
                    );
            } else {
                $existing = DB::table('planika_maloprodaja_sales_plans')
                    ->where('employee_id', $manager->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->first();
                
                if (!$existing) {
                    DB::table('planika_maloprodaja_sales_plans')->insert($planData);
                }
            }
            $this->successCount++;
            $this->recalculatePerformance($manager->id, $year, $month);
        }

        // Planovi za obične radnike
        foreach ($regularEmployees as $employee) {
            $planData = [
                'employee_id' => $employee->id,
                'year' => $year,
                'month' => $month,
                'planned_revenue' => $regularRevenuePlan,
                'revenue_currency' => 'BAM',
                'planned_shoe_pairs' => $regularShoePairsPlan,
                'planned_merchandise_pieces' => $regularMerchandisePlan,
                'created_by' => $this->userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($this->overwrite) {
                DB::table('planika_maloprodaja_sales_plans')
                    ->updateOrInsert(
                        [
                            'employee_id' => $employee->id,
                            'year' => $year,
                            'month' => $month,
                        ],
                        $planData
                    );
            } else {
                $existing = DB::table('planika_maloprodaja_sales_plans')
                    ->where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->first();
                
                if (!$existing) {
                    DB::table('planika_maloprodaja_sales_plans')->insert($planData);
                }
            }
            $this->successCount++;
            $this->recalculatePerformance($employee->id, $year, $month);
        }
    }

    protected function importPlan($row, $rowNumber)
    {
        // Stara metoda - zadržana za kompatibilnost, ali ne koristi se više
        // Mapiranje kolona iz Excel-a
        // Očekivani format: Prodavnica, Broj radnika, Mjesec, Godina, Plan finansijski, Plan pari obuće, Plan komadne robe
        $storeName = $this->getValue($row, ['prodavnica', 'store', 'store_name', 'naziv_prodavnice']);
        $storeCode = $this->getValue($row, ['sifra_prodavnice', 'store_code', 'code']);
        $numEmployees = (int) $this->getValue($row, ['broj_radnika', 'number_of_employees', 'num_employees', 'broj_zaposlenih'], 1);
        $month = (int) $this->getValue($row, ['mjesec', 'month', 'mjesec_godine']);
        $year = (int) $this->getValue($row, ['godina', 'year', 'godina_mjeseca']);
        $plannedRevenue = $this->getValue($row, ['plan_finansijski', 'planned_revenue', 'revenue', 'promet', 'plan_promet'], null);
        $plannedShoePairs = (int) $this->getValue($row, ['plan_pari_obuce', 'planned_shoe_pairs', 'shoe_pairs', 'parovi_obuce', 'plan_obuca'], 0);
        $plannedMerchandisePieces = (int) $this->getValue($row, ['plan_komadne_robe', 'planned_merchandise_pieces', 'merchandise_pieces', 'komadna_roba', 'plan_roba'], 0);

        // Validacija obaveznih polja
        if (!$storeName && !$storeCode) {
            throw new \Exception('Prodavnica je obavezna. Molimo unesite naziv ili šifru prodavnice.');
        }

        if (!$month || $month < 1 || $month > 12) {
            throw new \Exception('Mjesec mora biti između 1 i 12.');
        }

        if (!$year || $year < 2020 || $year > 2100) {
            throw new \Exception('Godina mora biti između 2020 i 2100.');
        }

        if ($numEmployees < 1) {
            throw new \Exception('Broj radnika mora biti veći od 0.');
        }

        // Pronađi prodavnicu
        $store = null;
        if ($storeCode) {
            $store = DB::table('hrm_stores')->where('code', $storeCode)->first();
        }
        if (!$store && $storeName) {
            $store = DB::table('hrm_stores')->where('name', 'like', '%' . $storeName . '%')->first();
        }

        if (!$store) {
            throw new \Exception('Prodavnica nije pronađena: ' . ($storeName ?: $storeCode));
        }

        // Parse revenue ako je prosleđen
        $revenueValue = null;
        if ($plannedRevenue) {
            $plannedRevenue = preg_replace('/[^\d.,]/', '', $plannedRevenue);
            $plannedRevenue = str_replace(',', '.', $plannedRevenue);
            $revenueValue = floatval($plannedRevenue);
        }

        // Pronađi sve zaposlenike u toj prodavnici
        $employees = DB::table('hrm_employees')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where(function($query) use ($store) {
                $query->where('hrm_employees.store', $store->name)
                      ->orWhere('hrm_employees.store', $store->code)
                      ->orWhere('hrm_employees.store', 'like', '%' . $store->name . '%');
            })
            ->where('hrm_employees.status', 'active')
            ->select('hrm_employees.id', 'hrm_employees.position', 'users.name')
            ->get();

        if ($employees->isEmpty()) {
            throw new \Exception('Nema aktivnih zaposlenika u prodavnici: ' . $store->name);
        }

        // Identifikuj menadžera (obično ima "menadžer", "manager", "voditelj" u poziciji)
        $manager = null;
        $regularEmployees = collect();
        
        foreach ($employees as $emp) {
            $positionLower = mb_strtolower($emp->position ?? '', 'UTF-8');
            if (strpos($positionLower, 'menadžer') !== false || 
                strpos($positionLower, 'manager') !== false || 
                strpos($positionLower, 'voditelj') !== false ||
                strpos($positionLower, 'šef') !== false) {
                $manager = $emp;
            } else {
                $regularEmployees->push($emp);
            }
        }

        // Ako nema eksplicitnog menadžera, uzmi prvog zaposlenika kao menadžera
        if (!$manager && $employees->count() > 0) {
            $manager = $employees->first();
            // Ukloni menadžera iz liste običnih radnika ako je već tamo
            $regularEmployees = $employees->filter(function($emp) use ($manager) {
                return $emp->id !== $manager->id;
            });
        }

        // Izračunaj plan po radniku
        // Plan se dijeli na broj radnika, ali menadžer ima 15% manji plan
        $totalEmployees = $employees->count();
        $managerPlanMultiplier = 0.85; // Menadžer ima 85% plana (15% manje)
        
        // Izračunaj plan po običnom radniku
        // Formula: total_plan = manager_plan * 0.85 + (num_employees - 1) * regular_plan
        // total_plan = regular_plan * (0.85 + num_employees - 1) = regular_plan * (num_employees - 0.15)
        // regular_plan = total_plan / (num_employees - 0.15)
        $regularPlanDivisor = $totalEmployees - 0.15;
        
        $regularRevenuePlan = $revenueValue ? ($revenueValue / $regularPlanDivisor) : null;
        $regularShoePairsPlan = $plannedShoePairs > 0 ? (int) round($plannedShoePairs / $regularPlanDivisor) : 0;
        $regularMerchandisePlan = $plannedMerchandisePieces > 0 ? (int) round($plannedMerchandisePieces / $regularPlanDivisor) : 0;

        $managerRevenuePlan = $regularRevenuePlan ? ($regularRevenuePlan * $managerPlanMultiplier) : null;
        $managerShoePairsPlan = (int) round($regularShoePairsPlan * $managerPlanMultiplier);
        $managerMerchandisePlan = (int) round($regularMerchandisePlan * $managerPlanMultiplier);

        // Kreiraj planove za sve zaposlenike
        $createdPlans = [];

        // Plan za menadžera
        if ($manager) {
            $planData = [
                'employee_id' => $manager->id,
                'year' => $year,
                'month' => $month,
                'planned_revenue' => $managerRevenuePlan,
                'revenue_currency' => 'BAM',
                'planned_shoe_pairs' => $managerShoePairsPlan,
                'planned_merchandise_pieces' => $managerMerchandisePlan,
                'created_by' => $this->userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($this->overwrite) {
                DB::table('planika_maloprodaja_sales_plans')
                    ->updateOrInsert(
                        [
                            'employee_id' => $manager->id,
                            'year' => $year,
                            'month' => $month,
                        ],
                        $planData
                    );
            } else {
                $existing = DB::table('planika_maloprodaja_sales_plans')
                    ->where('employee_id', $manager->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->first();
                
                if (!$existing) {
                    DB::table('planika_maloprodaja_sales_plans')->insert($planData);
                }
            }
            $createdPlans[] = $manager->name . ' (menadžer)';
        }

        // Planovi za obične radnike
        foreach ($regularEmployees as $employee) {
            $planData = [
                'employee_id' => $employee->id,
                'year' => $year,
                'month' => $month,
                'planned_revenue' => $regularRevenuePlan,
                'revenue_currency' => 'BAM',
                'planned_shoe_pairs' => $regularShoePairsPlan,
                'planned_merchandise_pieces' => $regularMerchandisePlan,
                'created_by' => $this->userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($this->overwrite) {
                DB::table('planika_maloprodaja_sales_plans')
                    ->updateOrInsert(
                        [
                            'employee_id' => $employee->id,
                            'year' => $year,
                            'month' => $month,
                        ],
                        $planData
                    );
            } else {
                $existing = DB::table('planika_maloprodaja_sales_plans')
                    ->where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->first();
                
                if (!$existing) {
                    DB::table('planika_maloprodaja_sales_plans')->insert($planData);
                }
            }
            $createdPlans[] = $employee->name;
        }

        $this->successCount += count($createdPlans);

        // Recalculate performance za sve zaposlenike
        foreach ($employees as $employee) {
            $this->recalculatePerformance($employee->id, $year, $month);
        }
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

