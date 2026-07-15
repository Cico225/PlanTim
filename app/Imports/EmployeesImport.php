<?php

namespace App\Imports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Illuminate\Support\Collection;

class EmployeesImport implements ToCollection, WithHeadingRow
{
    protected $errors = [];
    protected $successCount = 0;
    protected $errorCount = 0;

    public function collection(Collection $rows)
    {
        // Debug: Loguj prvi red da vidimo kako se kolone nazivaju
        if ($rows->isNotEmpty()) {
            $firstRow = $rows->first();
            Log::info('Employee import - First row keys', [
                'keys' => array_keys($firstRow->toArray()),
                'first_row' => $firstRow->toArray()
            ]);
        }

        foreach ($rows as $rowIndex => $row) {
            try {
                $this->importEmployee($row);
            } catch (\Exception $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'row_number' => $rowIndex + 2, // +2 jer je prvi red header, a index počinje od 0
                    'row' => $row->toArray(),
                    'error' => $e->getMessage()
                ];
                Log::error('Employee import error', [
                    'row_number' => $rowIndex + 2,
                    'row' => $row->toArray(),
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    protected function importEmployee($row)
    {
        // Mapiranje kolona iz Excel-a na polja baze
        // WithHeadingRow normalizuje nazive: razmaci->underscore, lowercase, uklanja dijakritike
        // Prioritet: normalizovani nazivi (ime, prezime, e_posta, itd.)
        $firstName = $this->getValue($row, ['ime', 'Ime', 'first_name', 'firstname']);
        $lastName = $this->getValue($row, ['prezime', 'Prezime', 'last_name', 'lastname']);
        $email = $this->getValue($row, ['e_posta', 'e-pošta', 'E-pošta', 'email', 'e-mail', 'e_mail']);
        $employeeNumber = $this->getValue($row, ['broj_zaposlenog', 'broj zaposlenog', 'Broj zaposlenog', 'employee_number', 'employee_id']);
        $municipalityCode = $this->getValue($row, ['opcina', 'Opcina', 'municipality_code', 'municipality']);
        $hireDateRaw = $this->getValue($row, ['datum_pocetka', 'datum početka', 'Datum početka', 'datum_početka', 'hire_date', 'start_date']);
        $hireDate = $this->parseDate($hireDateRaw);
        $position = $this->getValue($row, ['naziv_pozicije', 'naziv pozicije', 'Naziv pozicije', 'position', 'pozicija']);
        $gender = $this->getValue($row, ['pol', 'Pol', 'gender']);
        $jobTitle = $this->getValue($row, ['naziv_radnog_mjesta', 'naziv radnog mjesta', 'Naziv radnog mjesta', 'job_title']);
        $store = $this->getValue($row, ['prodavnica', 'Prodavnica', 'store']);
        $mobilePhone = $this->getValue($row, ['mobilni_telefon', 'mobilni telefon', 'Mobilni telefon', 'mobile_phone', 'phone']);
        $privateAddress = $this->getValue($row, ['ulica_privatno', 'ulica - privatno', 'Ulica - privatno', 'ulica_privatno', 'private_address', 'address']);
        $dateOfBirthRaw = $this->getValue($row, ['datum_rodjenja', 'datum rođenja', 'Datum rođenja', 'datum_rođenja', 'date_of_birth', 'birth_date']);
        $dateOfBirth = $this->parseDate($dateOfBirthRaw);
        $maritalStatus = $this->getValue($row, ['bracno_stanje', 'bračno stanje', 'Bračno stanje', 'bračno_stanje', 'marital_status']);
        $childrenCount = (int) $this->getValue($row, ['broj_dece', 'broj dece', 'Broj dece', 'children_count', 'children'], 0);
        $photo = $this->getValue($row, ['slika', 'Slika', 'photo', 'avatar']);
        $departmentName = $this->getValue($row, ['naziv_odjeljenja', 'naziv odjeljenja', 'Naziv odjeljenja', 'department_name', 'department']);

        // Validacija obaveznih polja
        if (!$firstName || !$lastName || !$employeeNumber || !$hireDate || !$position) {
            throw new \Exception('Nedostaju obavezna polja: Ime, Prezime, Broj zaposlenog, Datum početka, Naziv pozicije');
        }

        // Generiši email ako ne postoji
        if (!$email || $email === '') {
            // Generiši email iz imena i prezimena
            $emailBase = $this->generateEmailBase($firstName, $lastName);
            $email = $emailBase . '@plantim.local';
            
            // Provjeri da li email već postoji, ako da dodaj broj
            $counter = 1;
            $originalEmail = $email;
            while (DB::table('users')->where('email', $email)->exists()) {
                $email = $emailBase . $counter . '@plantim.local';
                $counter++;
            }
        }

        // Provjera da li korisnik već postoji
        $user = DB::table('users')->where('email', $email)->first();
        
        if (!$user) {
            // Kreiranje novog korisnika
            $userId = DB::table('users')->insertGetId([
                'name' => $firstName . ' ' . $lastName,
                'email' => $email,
                'password' => Hash::make('password123'), // Default password, korisnik će morati promijeniti
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $userId = $user->id;
        }

        // Provjera da li zaposlenik već postoji
        $existingEmployee = DB::table('hrm_employees')
            ->where('employee_id', $employeeNumber)
            ->orWhere('user_id', $userId)
            ->first();

        if ($existingEmployee) {
            throw new \Exception("Zaposlenik sa brojem {$employeeNumber} ili emailom {$email} već postoji");
        }

        // Pronalaženje ili kreiranje odjela
        $departmentId = null;
        if ($departmentName) {
            $department = DB::table('hrm_departments')
                ->where('name', 'LIKE', '%' . $departmentName . '%')
                ->first();
            
            if (!$department) {
                $departmentId = DB::table('hrm_departments')->insertGetId([
                    'name' => $departmentName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $departmentId = $department->id;
            }
        }

        // Normalizacija podataka
        $genderNormalized = $this->normalizeGender($gender);
        $maritalStatusNormalized = $this->normalizeMaritalStatus($maritalStatus);

        // Kreiranje zaposlenika
        DB::table('hrm_employees')->insert([
            'user_id' => $userId,
            'employee_id' => $employeeNumber,
            'municipality_code' => $municipalityCode,
            'department_id' => $departmentId,
            'position' => $position,
            'job_title' => $jobTitle,
            'store' => $store,
            'gender' => $genderNormalized,
            'employment_type' => 'full-time',
            'hire_date' => $hireDate,
            'phone' => $mobilePhone, // Koristimo postojeće 'phone' polje
            'mobile_phone' => $mobilePhone, // Također dodajemo mobile_phone ako postoji
            'address' => $privateAddress, // Koristimo postojeće 'address' polje
            'private_address' => $privateAddress, // Također dodajemo private_address ako postoji
            'date_of_birth' => $dateOfBirth,
            'marital_status' => $maritalStatusNormalized,
            'children_count' => $childrenCount,
            'photo' => $photo,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->successCount++;
    }

    protected function getValue($row, $keys, $default = null)
    {
        // Konvertuj row u array ako je Collection
        $rowArray = $row instanceof \Illuminate\Support\Collection ? $row->toArray() : (array) $row;
        
        foreach ($keys as $key) {
            // WithHeadingRow normalizuje nazive kolona - lowercase, razmaci u underscore, itd.
            // Pokušaj različitih varijanti naziva kolona koje WithHeadingRow može generisati
            $variants = [
                // Originalni nazivi
                $key,
                mb_strtolower($key, 'UTF-8'),
                mb_strtoupper($key, 'UTF-8'),
                
                // Normalizovani nazivi (kako WithHeadingRow radi)
                $this->normalizeColumnName($key),
                mb_strtolower($this->normalizeColumnName($key), 'UTF-8'),
                
                // Varijante sa razmacima, crticama, underscore
                str_replace(' ', '_', mb_strtolower($key, 'UTF-8')),
                str_replace('-', '_', mb_strtolower($key, 'UTF-8')),
                str_replace([' ', '-'], '_', mb_strtolower($key, 'UTF-8')),
                preg_replace('/[^a-z0-9_]/', '_', mb_strtolower($key, 'UTF-8')),
                
                // Bez dijakritika (ć->c, š->s, itd.)
                $this->removeDiacritics(mb_strtolower($key, 'UTF-8')),
                str_replace(' ', '_', $this->removeDiacritics(mb_strtolower($key, 'UTF-8'))),
            ];

            foreach ($variants as $variant) {
                // Provjeri direktno
                if (isset($rowArray[$variant]) && $rowArray[$variant] !== null && $rowArray[$variant] !== '') {
                    $value = is_string($rowArray[$variant]) ? trim($rowArray[$variant]) : $rowArray[$variant];
                    if ($value !== '') {
                        return $value;
                    }
                }
                
                // Provjeri case-insensitive i sa normalizacijom
                foreach ($rowArray as $rowKey => $rowValue) {
                    $normalizedRowKey = $this->normalizeColumnName($rowKey);
                    $normalizedVariant = $this->normalizeColumnName($variant);
                    
                    if (mb_strtolower(trim($normalizedRowKey), 'UTF-8') === mb_strtolower(trim($normalizedVariant), 'UTF-8')) {
                        $value = is_string($rowValue) ? trim($rowValue) : $rowValue;
                        if ($value !== null && $value !== '') {
                            return $value;
                        }
                    }
                }
            }
        }
        return $default;
    }

    /**
     * Normalizuje naziv kolone kako bi odgovarao onome što WithHeadingRow generiše
     */
    protected function normalizeColumnName($name)
    {
        // WithHeadingRow: lowercase, razmaci u underscore, uklanja posebne karaktere
        $normalized = mb_strtolower($name, 'UTF-8');
        $normalized = str_replace([' ', '-'], '_', $normalized);
        $normalized = preg_replace('/[^a-z0-9_]/', '_', $normalized);
        $normalized = preg_replace('/_+/', '_', $normalized); // Višestruki underscore u jedan
        return trim($normalized, '_');
    }

    /**
     * Uklanja dijakritike (ć->c, š->s, đ->d, č->c, ž->z)
     */
    protected function removeDiacritics($text)
    {
        $replacements = [
            'ć' => 'c', 'č' => 'c', 'đ' => 'd', 'š' => 's', 'ž' => 'z',
            'Ć' => 'C', 'Č' => 'C', 'Đ' => 'D', 'Š' => 'S', 'Ž' => 'Z',
        ];
        return strtr($text, $replacements);
    }

    /**
     * Generiše email base iz imena i prezimena
     */
    protected function generateEmailBase($firstName, $lastName)
    {
        $first = mb_strtolower($this->removeDiacritics($firstName), 'UTF-8');
        $last = mb_strtolower($this->removeDiacritics($lastName), 'UTF-8');
        
        // Ukloni sve što nije slovo ili broj
        $first = preg_replace('/[^a-z0-9]/', '', $first);
        $last = preg_replace('/[^a-z0-9]/', '', $last);
        
        return $first . '.' . $last;
    }

    protected function parseDate($dateValue)
    {
        if (!$dateValue || $dateValue === '' || $dateValue === null) {
            return null;
        }

        // Excel datumi su brojevi (dani od 1900-01-01)
        // Provjeri da li je broj
        if (is_numeric($dateValue)) {
            try {
                // Excel epoch počinje od 1900-01-01, ali Excel tretira 1900 kao prijestupnu godinu
                // PHP DateTime koristi 1970-01-01 kao epoch
                // Excel: 1 = 1900-01-01, 2 = 1900-01-02, itd.
                // PHP: 0 = 1970-01-01
                // Razlika: 25569 dana (70 godina * 365.25 dana + 19 prijestupnih dana)
                
                $excelDate = (float) $dateValue;
                if ($excelDate > 0 && $excelDate < 100000) { // Razuman opseg za Excel datume
                    // Excel koristi 1900-01-01 kao datum 1, ali greška u Excel-u: 1900 se smatra prijestupnom
                    // Za PHP, koristimo 1899-12-30 kao bazni datum
                    $baseDate = new \DateTime('1899-12-30');
                    $baseDate->modify('+' . (int)$excelDate . ' days');
                    return $baseDate->format('Y-m-d');
                }
            } catch (\Exception $e) {
                // Ignore, pokušaj druge formate
            }
        }

        // Ako nije Excel format, pokušaj različite formate datuma
        $formats = ['d.m.Y', 'd/m/Y', 'Y-m-d', 'd-m-Y', 'Y.m.d', 'Y/m/d'];
        
        foreach ($formats as $format) {
            try {
                $date = \DateTime::createFromFormat($format, $dateValue);
                if ($date) {
                    return $date->format('Y-m-d');
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        // Ako ništa ne radi, pokušaj strtotime
        try {
            $timestamp = strtotime($dateValue);
            if ($timestamp) {
                return date('Y-m-d', $timestamp);
            }
        } catch (\Exception $e) {
            // Ignore
        }

        return null;
    }

    protected function normalizeGender($gender)
    {
        if (!$gender) {
            return null;
        }

        $gender = strtoupper(trim($gender));
        if (in_array($gender, ['M', 'MALE', 'MUŠKI', 'MUŠKARAC'])) {
            return 'M';
        }
        if (in_array($gender, ['F', 'FEMALE', 'ŽENSKI', 'ŽENA'])) {
            return 'F';
        }
        return null;
    }

    protected function normalizeMaritalStatus($status)
    {
        if (!$status) {
            return null;
        }

        $status = strtoupper(trim($status));
        $map = [
            'S' => 'S',
            'SINGLE' => 'S',
            'NEOŽENJEN' => 'S',
            'NEUDAJA' => 'S',
            'M' => 'M',
            'MARRIED' => 'M',
            'OŽENJEN' => 'M',
            'UDATA' => 'M',
            'D' => 'D',
            'DIVORCED' => 'D',
            'RAZVEDEN' => 'D',
            'W' => 'W',
            'WIDOWED' => 'W',
            'UDOVAC' => 'W',
            'UDOVICA' => 'W',
        ];

        return $map[$status] ?? null;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function getSuccessCount()
    {
        return $this->successCount;
    }

    public function getErrorCount()
    {
        return $this->errorCount;
    }
}
