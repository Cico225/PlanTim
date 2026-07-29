<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\EmployeesImport;

class HRMController extends Controller
{
    public function getDashboard(Request $request)
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $stats = [
            'total_employees' => 0,
            'active_employees' => 0,
            'on_leave_today' => 0,
            'pending_leaves' => 0,
            'pending_evaluations' => 0,
            'expiring_contracts' => 0,
            'onboarding_in_progress' => 0,
            'offboarding_in_progress' => 0,
            'new_hires_this_month' => 0,
            'terminations_this_month' => 0,
            'upcoming_birthdays' => 0,
            'upcoming_anniversaries' => 0,
        ];

        $recentActivities = collect();
        $alerts = collect();

        if (Schema::hasTable('hrm_employees')) {
            $employeeBase = DB::table('hrm_employees');

            if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
                $employeeBase->whereNull('deleted_at');
            }

            $stats['total_employees'] = (clone $employeeBase)->count();
            $stats['active_employees'] = (clone $employeeBase)->where('status', 'active')->count();
            $stats['offboarding_in_progress'] = (clone $employeeBase)->where('status', 'offboarding')->count();

            if (Schema::hasColumn('hrm_employees', 'hire_date')) {
                $stats['new_hires_this_month'] = (clone $employeeBase)
                    ->whereBetween('hire_date', [$monthStart, $monthEnd])
                    ->count();

                $stats['upcoming_anniversaries'] = (clone $employeeBase)
                    ->whereNotNull('hire_date')
                    ->whereRaw("DATE_FORMAT(hire_date, '%m-%d') between ? and ?", [
                        now()->format('m-d'),
                        now()->copy()->addDays(30)->format('m-d'),
                    ])
                    ->count();

                $newHires = DB::table('hrm_employees')
                    ->select('hrm_employees.id', 'users.name', 'hrm_employees.hire_date')
                    ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                    ->whereBetween('hrm_employees.hire_date', [$monthStart, $monthEnd])
                    ->orderByDesc('hrm_employees.hire_date')
                    ->limit(4)
                    ->get()
                    ->map(function ($row) {
                        return [
                            'id' => 'hire-' . $row->id,
                            'type' => 'employee_hired',
                            'title' => 'Novi zaposlenik',
                            'description' => trim(($row->name ?? 'Nepoznat zaposlenik') . ' je evidentiran kao novi zaposlenik.'),
                            'date' => $row->hire_date,
                            'created_at' => $row->hire_date,
                        ];
                    });

                $recentActivities = $recentActivities->concat($newHires);
            }

            if (Schema::hasColumn('hrm_employees', 'termination_date')) {
                $stats['terminations_this_month'] = (clone $employeeBase)
                    ->whereBetween('termination_date', [$monthStart, $monthEnd])
                    ->count();
            }

            if (Schema::hasColumn('hrm_employees', 'date_of_birth')) {
                $stats['upcoming_birthdays'] = (clone $employeeBase)
                    ->whereNotNull('date_of_birth')
                    ->whereRaw("DATE_FORMAT(date_of_birth, '%m-%d') between ? and ?", [
                        now()->format('m-d'),
                        now()->copy()->addDays(30)->format('m-d'),
                    ])
                    ->count();
            }
        }

        if (Schema::hasTable('hrm_employment_contracts')) {
            $noticeDays = (int) (DB::table('hrm_contract_settings')->value('default_renewal_notice_days') ?? 30);
            $stats['expiring_contracts'] = DB::table('hrm_employment_contracts')
                ->where('status', 'active')
                ->whereNotNull('expiry_date')
                ->whereBetween('expiry_date', [$today, now()->addDays($noticeDays)->toDateString()])
                ->count();
        } elseif (Schema::hasColumn('hrm_employees', 'probation_end_date')) {
            $expiringProbation = DB::table('hrm_employees')
                ->select('hrm_employees.id', 'users.name', 'hrm_employees.probation_end_date')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->whereNotNull('hrm_employees.probation_end_date')
                ->whereBetween('hrm_employees.probation_end_date', [$today, now()->copy()->addDays(30)->toDateString()])
                ->orderBy('hrm_employees.probation_end_date')
                ->limit(5)
                ->get();

            $stats['expiring_contracts'] = $expiringProbation->count();

            $alerts = $alerts->concat($expiringProbation->map(function ($row) {
                return [
                    'id' => 100000 + $row->id,
                    'type' => 'contract_expiry',
                    'title' => 'Ističe probni rad / ugovorni rok',
                    'message' => trim(($row->name ?? 'Nepoznat zaposlenik') . ' ima rok isteka ' . $row->probation_end_date . '.'),
                    'priority' => 'high',
                    'status' => 'active',
                    'employee_id' => $row->id,
                    'employee_name' => $row->name,
                    'due_date' => $row->probation_end_date,
                    'created_at' => $row->probation_end_date,
                ];
            }));
        }

        if (Schema::hasTable('hrm_leaves')) {
            $stats['pending_leaves'] = DB::table('hrm_leaves')->where('status', 'pending')->count();
            $stats['on_leave_today'] = DB::table('hrm_leaves')
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->count();

            $pendingLeaves = DB::table('hrm_leaves')
                ->select('hrm_leaves.id', 'hrm_leaves.start_date', 'hrm_leaves.end_date', 'users.name')
                ->join('hrm_employees', 'hrm_leaves.employee_id', '=', 'hrm_employees.id')
                ->join('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('hrm_leaves.status', 'pending')
                ->orderBy('hrm_leaves.created_at')
                ->limit(5)
                ->get();

            $alerts = $alerts->concat($pendingLeaves->map(function ($row) {
                return [
                    'id' => 200000 + $row->id,
                    'type' => 'leave_pending',
                    'title' => 'Zahtjev za odsustvo čeka odobrenje',
                    'message' => trim(($row->name ?? 'Nepoznat zaposlenik') . ' traži odsustvo od ' . $row->start_date . ' do ' . $row->end_date . '.'),
                    'priority' => 'medium',
                    'status' => 'active',
                    'due_date' => $row->start_date,
                    'created_at' => $row->start_date,
                ];
            }));
        }

        if (Schema::hasTable('hrm_evaluations')) {
            $stats['pending_evaluations'] = DB::table('hrm_evaluations')
                ->whereIn('status', ['draft', 'pending', 'in_progress'])
                ->count();
        }

        if (Schema::hasTable('hrm_onboarding_processes')) {
            $stats['onboarding_in_progress'] = DB::table('hrm_onboarding_processes')
                ->whereIn('status', ['pending', 'in_progress', 'active'])
                ->count();

            $onboardingItems = DB::table('hrm_onboarding_processes')
                ->select('hrm_onboarding_processes.id', 'hrm_onboarding_processes.start_date', 'users.name')
                ->leftJoin('hrm_employees', 'hrm_onboarding_processes.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->whereIn('hrm_onboarding_processes.status', ['pending', 'in_progress', 'active'])
                ->orderByDesc('hrm_onboarding_processes.updated_at')
                ->limit(4)
                ->get()
                ->map(function ($row) {
                    return [
                        'id' => 'onboarding-' . $row->id,
                        'type' => 'onboarding',
                        'title' => 'Onboarding u toku',
                        'description' => trim(($row->name ?? 'Nepoznat zaposlenik') . ' ima aktivan onboarding proces.'),
                        'date' => $row->start_date,
                        'created_at' => $row->start_date,
                    ];
                });

            $recentActivities = $recentActivities->concat($onboardingItems);
        }

        if (Schema::hasTable('ats_candidates')) {
            $candidateItems = DB::table('ats_candidates')
                ->select('ats_candidates.id', 'ats_candidates.first_name', 'ats_candidates.last_name', 'ats_candidates.applied_date', 'ats_candidates.status')
                ->orderByDesc('ats_candidates.created_at')
                ->limit(4)
                ->get()
                ->map(function ($row) {
                    $fullName = trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));

                    return [
                        'id' => 'candidate-' . $row->id,
                        'type' => 'candidate',
                        'title' => 'Nova ATS aktivnost',
                        'description' => trim(($fullName ?: 'Kandidat') . ' je u statusu ' . ($row->status ?? 'new') . '.'),
                        'date' => $row->applied_date ?: now()->toDateString(),
                        'created_at' => $row->applied_date ?: now()->toDateString(),
                    ];
                });

            $recentActivities = $recentActivities->concat($candidateItems);
        }

        if (Schema::hasTable('ats_interviews')) {
            $upcomingInterviews = DB::table('ats_interviews')
                ->select(
                    'ats_interviews.id',
                    'ats_interviews.scheduled_date',
                    'ats_interviews.status',
                    DB::raw("CONCAT(ats_candidates.first_name, ' ', ats_candidates.last_name) as candidate_name")
                )
                ->join('ats_candidates', 'ats_interviews.candidate_id', '=', 'ats_candidates.id')
                ->whereDate('ats_interviews.scheduled_date', '>=', $today)
                ->where('ats_interviews.status', 'scheduled')
                ->orderBy('ats_interviews.scheduled_date')
                ->limit(5)
                ->get();

            $alerts = $alerts->concat($upcomingInterviews->map(function ($row) {
                return [
                    'id' => 300000 + $row->id,
                    'type' => 'interview',
                    'title' => 'Zakazan intervju',
                    'message' => trim(($row->candidate_name ?? 'Kandidat') . ' ima intervju ' . $row->scheduled_date . '.'),
                    'priority' => 'low',
                    'status' => 'active',
                    'due_date' => $row->scheduled_date,
                    'created_at' => $row->scheduled_date,
                ];
            }));
        }

        $recentActivities = $recentActivities
            ->sortByDesc('created_at')
            ->take(6)
            ->values();

        $alerts = $alerts
            ->sortBy(function ($item) {
                $priorityRank = match ($item['priority'] ?? 'low') {
                    'urgent' => 0,
                    'high' => 1,
                    'medium' => 2,
                    default => 3,
                };

                return sprintf(
                    '%s-%s',
                    $priorityRank,
                    $item['due_date'] ?? $item['created_at'] ?? '9999-12-31'
                );
            })
            ->take(8)
            ->values();

        return response()->json([
            'stats' => $stats,
            'recent_activities' => $recentActivities,
            'alerts' => $alerts,
        ]);
    }

    public function getAlerts(Request $request)
    {
        $dashboard = $this->getDashboard($request)->getData(true);

        return response()->json($dashboard['alerts'] ?? []);
    }

    /**
     * Get all employees
     */
    public function index(Request $request)
    {
        $query = DB::table('hrm_employees')
            ->select('hrm_employees.*', 'users.name', 'users.email', 'hrm_departments.name as department_name')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->orderBy('hrm_employees.hire_date', 'desc');

        // Check for soft deletes
        if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
            $query->whereNull('hrm_employees.deleted_at');
        }

        if ($request->has('department_id') && $request->input('department_id')) {
            $query->where('hrm_employees.department_id', $request->input('department_id'));
        }

        if ($request->has('status') && $request->input('status')) {
            $query->where('hrm_employees.status', $request->input('status'));
        }

        if ($request->has('position') && $request->input('position')) {
            $position = $request->input('position');
            // Use LIKE for case-insensitive partial matching
            // Check both position and job_title fields
            // Also check if position field exists in schema
            $query->where(function($q) use ($position) {
                $q->where('hrm_employees.position', 'like', '%' . $position . '%');
                // Check job_title if column exists
                if (Schema::hasColumn('hrm_employees', 'job_title')) {
                    $q->orWhere('hrm_employees.job_title', 'like', '%' . $position . '%');
                }
            });
        }

        // If filtering by position, return all results (no pagination)
        // Otherwise use pagination
        if ($request->has('position') && $request->input('position')) {
            $employees = $query->get();
            return response()->json($employees);
        }

        $employees = $query->paginate(20);

        return response()->json($employees);
    }

    /**
     * Get single employee
     */
    public function show($id)
    {
        $employee = DB::table('hrm_employees')
            ->select('hrm_employees.*', 'users.name', 'users.email', 'hrm_departments.name as department_name')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->where('hrm_employees.id', $id)
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        return response()->json($employee);
    }

    /**
     * Create employee
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Osnovni podaci
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'employee_number' => 'required|string|unique:hrm_employees,employee_id',
            
            // Opcioni user_id (ako se kreira novi korisnik, ne treba)
            'user_id' => 'nullable|exists:users,id|unique:hrm_employees,user_id',
            
            // Poslovni podaci
            'municipality_code' => 'nullable|string|max:20',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'position' => 'required|string|max:255',
            'job_title' => 'nullable|string|max:255',
            'store' => 'nullable|string|max:255',
            'hire_date' => 'required|date',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'status' => 'nullable|in:active,on-leave,terminated,candidate,hiring,on_hold,offboarding,former',
            'salary' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:hrm_employees,id',
            
            // Lični podaci
            'gender' => 'nullable|in:M,F',
            'mobile_phone' => 'nullable|string|max:50',
            'private_address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'marital_status' => 'nullable|in:S,M,D,W',
            'children_count' => 'nullable|integer|min:0',
            'photo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // Kreiranje korisnika ako user_id nije prosleđen
        $userId = $data['user_id'] ?? null;
        if (!$userId) {
            $userId = DB::table('users')->insertGetId([
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'email' => $data['email'],
                'password' => Hash::make('password123'), // Default password
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Priprema podataka za unos u hrm_employees
        $employeeData = [
            'user_id' => $userId,
            'employee_id' => $data['employee_number'], // Mapiranje employee_number na employee_id (tabela koristi employee_id)
            'municipality_code' => $data['municipality_code'] ?? null,
            'department_id' => $data['department_id'] ?? null,
            'position' => $data['position'],
            'job_title' => $data['job_title'] ?? null,
            'store' => $data['store'] ?? null,
            'gender' => $data['gender'] ?? null,
            'employment_type' => $data['employment_type'] ?? 'full-time',
            'hire_date' => $data['hire_date'],
            'phone' => $data['mobile_phone'] ?? null, // Koristimo postojeće 'phone' polje
            'mobile_phone' => $data['mobile_phone'] ?? null, // Također dodajemo mobile_phone ako postoji
            'address' => $data['private_address'] ?? null, // Koristimo postojeće 'address' polje
            'private_address' => $data['private_address'] ?? null, // Također dodajemo private_address ako postoji
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'marital_status' => $data['marital_status'] ?? null,
            'children_count' => $data['children_count'] ?? 0,
            'photo' => $data['photo'] ?? null,
            'status' => $data['status'] ?? 'active',
            'salary' => $data['salary'] ?? null,
            'manager_id' => $data['manager_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $employeeId = DB::table('hrm_employees')->insertGetId($employeeData);
        $employee = DB::table('hrm_employees')
            ->select('hrm_employees.*', 'users.name', 'users.email', 'hrm_departments.name as department_name')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->where('hrm_employees.id', $employeeId)
            ->first();

        return response()->json($employee, 201);
    }

    /**
     * Update employee
     */
    public function update(Request $request, $id)
    {
        $employee = DB::table('hrm_employees')->where('id', $id)->first();
        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $employee->user_id,
            'employee_number' => 'sometimes|required|string|unique:hrm_employees,employee_id,' . $id,
            'municipality_code' => 'nullable|string|max:20',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'position' => 'sometimes|required|string|max:255',
            'job_title' => 'nullable|string|max:255',
            'store' => 'nullable|string|max:255',
            'hire_date' => 'sometimes|required|date',
            'termination_date' => 'nullable|date',
            'probation_end_date' => 'nullable|date',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'status' => 'nullable|in:active,on-leave,terminated,candidate,hiring,on_hold,offboarding,former',
            'salary' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:hrm_employees,id',
            'mentor_id' => 'nullable|exists:hrm_employees,id',
            'gender' => 'nullable|in:M,F',
            'mobile_phone' => 'nullable|string|max:50',
            'private_address' => 'nullable|string',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'marital_status' => 'nullable|in:S,M,D,W',
            'children_count' => 'nullable|integer|min:0',
            'personal_id_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'photo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $employeeData = [];
        $userData = [];

        // Ažuriranje user podataka ako su promenjeni
        if (isset($data['first_name']) || isset($data['last_name']) || isset($data['email'])) {
            if (isset($data['first_name']) || isset($data['last_name'])) {
                $currentUser = DB::table('users')->where('id', $employee->user_id)->first();
                $firstName = $data['first_name'] ?? explode(' ', $currentUser->name ?? '')[0];
                $lastName = $data['last_name'] ?? (explode(' ', $currentUser->name ?? '', 2)[1] ?? '');
                $userData['name'] = $firstName . ' ' . $lastName;
            }
            if (isset($data['email'])) {
                $userData['email'] = $data['email'];
            }
            if (!empty($userData)) {
                DB::table('users')->where('id', $employee->user_id)->update($userData);
            }
        }

        // Priprema podataka za hrm_employees
        $allowedFields = [
            'employee_id' => 'employee_number',
            'municipality_code',
            'department_id',
            'position',
            'job_title',
            'store',
            'gender',
            'employment_type',
            'hire_date',
            'termination_date',
            'probation_end_date',
            'mobile_phone',
            'phone',
            'private_address',
            'address',
            'date_of_birth',
            'marital_status',
            'children_count',
            'personal_id_number',
            'status',
            'salary',
            'manager_id',
            'mentor_id',
            'notes',
            'photo',
        ];

        foreach ($allowedFields as $dbField => $inputField) {
            if (is_numeric($dbField)) {
                $dbField = $inputField;
            }
            if (isset($data[$inputField])) {
                if ($dbField === 'employee_id' && isset($data['employee_number'])) {
                    $employeeData['employee_id'] = $data['employee_number'];
                } elseif ($inputField === 'mobile_phone') {
                    $employeeData['mobile_phone'] = $data['mobile_phone'];
                    $employeeData['phone'] = $data['mobile_phone']; // Također ažuriraj phone polje
                } elseif ($inputField === 'private_address') {
                    $employeeData['private_address'] = $data['private_address'];
                    $employeeData['address'] = $data['private_address']; // Također ažuriraj address polje
                } else {
                    $employeeData[$dbField] = $data[$inputField];
                }
            }
        }

        $employeeData['updated_at'] = now();

        if (!empty($employeeData)) {
            DB::table('hrm_employees')->where('id', $id)->update($employeeData);
        }

        // Vraćanje ažuriranog zaposlenika
        $updatedEmployee = DB::table('hrm_employees')
            ->select('hrm_employees.*', 'users.name', 'users.email', 'hrm_departments.name as department_name')
            ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.manager_id) as manager_name')
            ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.mentor_id) as mentor_name')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->where('hrm_employees.id', $id)
            ->first();

        return response()->json($updatedEmployee);
    }

    /**
     * Delete employee
     */
    public function destroy($id)
    {
        $employee = DB::table('hrm_employees')->where('id', $id)->first();
        
        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        // Check if table has deleted_at column for soft delete
        $hasSoftDelete = DB::select("SHOW COLUMNS FROM hrm_employees LIKE 'deleted_at'");
        
        if (!empty($hasSoftDelete)) {
            // Soft delete
            DB::table('hrm_employees')
                ->where('id', $id)
                ->update(['deleted_at' => now()]);
        } else {
            // Hard delete - also delete associated user if cascade is not enabled
            // Note: Foreign key constraint should handle this, but we'll be explicit
            try {
                DB::beginTransaction();
                
                // Delete employee record
                DB::table('hrm_employees')->where('id', $id)->delete();
                
                // Delete user if no other employee references it
                $userEmployeeCount = DB::table('hrm_employees')
                    ->where('user_id', $employee->user_id)
                    ->count();
                
                if ($userEmployeeCount === 0) {
                    DB::table('users')->where('id', $employee->user_id)->delete();
                }
                
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error deleting employee: ' . $e->getMessage());
                return response()->json(['message' => 'Greška pri brisanju zaposlenika: ' . $e->getMessage()], 500);
            }
        }

        return response()->json(['message' => 'Zaposlenik je uspješno obrisan']);
    }

    /**
     * Import employees from Excel/CSV
     */
    public function import(Request $request)
    {
        // Provjeri da li fajl postoji
        if (!$request->hasFile('file')) {
            return response()->json([
                'success' => false,
                'message' => 'Fajl nije priložen.',
                'errors' => ['file' => ['Fajl je obavezan.']]
            ], 422);
        }

        $file = $request->file('file');
        
        // Validacija
        $validator = Validator::make($request->all(), [
            'file' => 'required|mimes:xlsx,xls,csv|max:10240', // Max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Greška u validaciji fajla.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $import = new EmployeesImport();
            Excel::import($import, $file);

            return response()->json([
                'success' => true,
                'message' => 'Import završen',
                'imported' => $import->getSuccessCount(),
                'errors' => $import->getErrorCount(),
                'error_details' => $import->getErrors(),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Employee import failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Greška pri importu: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ==================== DEPARTMENTS ====================

    /**
     * Get all departments
     */
    public function getDepartments()
    {
        try {
            $departments = DB::table('hrm_departments')
                ->select('hrm_departments.*')
                ->selectRaw('(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id) as employees_count')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_departments.manager_id) as manager_name')
                ->selectRaw('(SELECT name FROM hrm_departments parent WHERE parent.id = hrm_departments.parent_department_id) as parent_department_name')
                ->orderBy('hrm_departments.name', 'asc')
                ->get();

            return response()->json($departments);
        } catch (\Exception $e) {
            Log::error('Error fetching departments', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get single department
     */
    public function getDepartment($id)
    {
        try {
            $department = DB::table('hrm_departments')
                ->select('hrm_departments.*')
                ->selectRaw('(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id) as employees_count')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_departments.manager_id) as manager_name')
                ->selectRaw('(SELECT name FROM hrm_departments parent WHERE parent.id = hrm_departments.parent_department_id) as parent_department_name')
                ->where('hrm_departments.id', $id)
                ->first();

            if (!$department) {
                return response()->json(['message' => 'Department not found'], 404);
            }

            return response()->json($department);
        } catch (\Exception $e) {
            Log::error('Error fetching department', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create department
     */
    public function storeDepartment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:hrm_departments,name',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'parent_department_id' => 'nullable|exists:hrm_departments,id',
            'division_type' => 'required|in:direkcija,maloprodaja',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $departmentId = DB::table('hrm_departments')->insertGetId(array_merge(
            $validator->validated(),
            ['created_at' => now(), 'updated_at' => now()]
        ));

        $department = DB::table('hrm_departments')->find($departmentId);

        return response()->json($department, 201);
    }

    /**
     * Update department
     */
    public function updateDepartment(Request $request, $id)
    {
        $department = DB::table('hrm_departments')->where('id', $id)->first();
        if (!$department) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:hrm_departments,name,' . $id,
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'parent_department_id' => 'nullable|exists:hrm_departments,id',
            'division_type' => 'sometimes|required|in:direkcija,maloprodaja',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('hrm_departments')->where('id', $id)->update($data);

        $department = DB::table('hrm_departments')->find($id);
        return response()->json($department);
    }

    /**
     * Delete department
     */
    public function deleteDepartment($id)
    {
        $department = DB::table('hrm_departments')->where('id', $id)->first();
        if (!$department) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        // Check if department has employees
        $employeesCount = DB::table('hrm_employees')->where('department_id', $id)->count();
        if ($employeesCount > 0) {
            return response()->json(['message' => 'Cannot delete department with employees'], 422);
        }

        // Check if department has child departments
        $childCount = DB::table('hrm_departments')->where('parent_department_id', $id)->count();
        if ($childCount > 0) {
            return response()->json(['message' => 'Cannot delete department with child departments'], 422);
        }

        DB::table('hrm_departments')->where('id', $id)->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }

    // ==================== LEAVES ====================

    /**
     * Get all leave requests
     */
    public function getLeaves(Request $request)
    {
        $query = DB::table('hrm_leaves')
            ->select('hrm_leaves.*', 'users.name as employee_name', 'hrm_employees.employee_id')
            ->join('hrm_employees', 'hrm_leaves.employee_id', '=', 'hrm_employees.id')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->orderBy('hrm_leaves.start_date', 'desc');

        if ($request->has('status')) {
            $query->where('hrm_leaves.status', $request->input('status'));
        }

        $leaves = $query->paginate(20);

        return response()->json($leaves);
    }

    /**
     * Request leave
     */
    public function requestLeave(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:vacation,sick,personal,maternity,paternity,other',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get employee ID from user
        $employee = DB::table('hrm_employees')
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee record not found'], 404);
        }

        // Calculate days
        $startDate = new \DateTime($request->input('start_date'));
        $endDate = new \DateTime($request->input('end_date'));
        $days = $startDate->diff($endDate)->days + 1;

        $leaveId = DB::table('hrm_leaves')->insertGetId([
            'employee_id' => $employee->id,
            'type' => $request->input('type'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'days' => $days,
            'reason' => $request->input('reason'),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $leave = DB::table('hrm_leaves')->find($leaveId);

        return response()->json($leave, 201);
    }

    /**
     * Approve/reject leave
     */
    public function updateLeaveStatus(Request $request, $leaveId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::table('hrm_leaves')
            ->where('id', $leaveId)
            ->update([
                'status' => $request->input('status'),
                'approved_by_id' => $request->user()->id,
                'updated_at' => now(),
            ]);

        $leave = DB::table('hrm_leaves')->find($leaveId);

        return response()->json($leave);
    }

    // ==================== TIME ENTRIES ====================

    /**
     * Get time entries
     */
    public function getTimeEntries(Request $request)
    {
        $query = DB::table('hrm_time_entries')
            ->select('hrm_time_entries.*', 'users.name as employee_name')
            ->join('hrm_employees', 'hrm_time_entries.employee_id', '=', 'hrm_employees.id')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->orderBy('hrm_time_entries.date', 'desc');

        if ($request->has('employee_id')) {
            $query->where('hrm_time_entries.employee_id', $request->input('employee_id'));
        }

        $entries = $query->paginate(30);

        return response()->json($entries);
    }

    /**
     * Clock in/out
     */
    public function clockInOut(Request $request)
    {
        $employee = DB::table('hrm_employees')
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee record not found'], 404);
        }

        $today = date('Y-m-d');
        
        // Check if there's an existing entry for today
        $entry = DB::table('hrm_time_entries')
            ->where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if (!$entry) {
            // Clock in
            $entryId = DB::table('hrm_time_entries')->insertGetId([
                'employee_id' => $employee->id,
                'date' => $today,
                'check_in' => now()->format('H:i:s'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'message' => 'Clocked in successfully',
                'entry' => DB::table('hrm_time_entries')->find($entryId),
            ]);
        } elseif (!$entry->check_out) {
            // Clock out
            $checkIn = new \DateTime($today . ' ' . $entry->check_in);
            $checkOut = new \DateTime();
            $hoursWorked = $checkIn->diff($checkOut)->h + ($checkIn->diff($checkOut)->i / 60);

            DB::table('hrm_time_entries')
                ->where('id', $entry->id)
                ->update([
                    'check_out' => $checkOut->format('H:i:s'),
                    'hours_worked' => round($hoursWorked, 2),
                    'updated_at' => now(),
                ]);

            return response()->json([
                'message' => 'Clocked out successfully',
                'entry' => DB::table('hrm_time_entries')->find($entry->id),
            ]);
        } else {
            return response()->json(['message' => 'Already clocked out today'], 422);
        }
    }

    // ============================================
    // ATS - APPLICANT TRACKING SYSTEM
    // ============================================

    /**
     * Get all job positions
     */
    public function getPositions(Request $request)
    {
        $query = DB::table('ats_positions')
            ->select('ats_positions.*', 'hrm_departments.name as department_name')
            ->leftJoin('hrm_departments', 'ats_positions.department_id', '=', 'hrm_departments.id')
            ->orderBy('ats_positions.created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('ats_positions.status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('ats_positions.title', 'like', "%{$search}%")
                  ->orWhere('ats_positions.description', 'like', "%{$search}%");
            });
        }

        $positions = $query->paginate(20);
        return response()->json($positions);
    }

    /**
     * Get single position
     */
    public function getPosition($id)
    {
        $position = DB::table('ats_positions')
            ->select('ats_positions.*', 'hrm_departments.name as department_name')
            ->leftJoin('hrm_departments', 'ats_positions.department_id', '=', 'hrm_departments.id')
            ->where('ats_positions.id', $id)
            ->first();

        if (!$position) {
            return response()->json(['message' => 'Position not found'], 404);
        }

        return response()->json($position);
    }

    /**
     * Create position
     */
    public function createPosition(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'status' => 'nullable|in:draft,open,closed,on_hold',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'posted_date' => 'nullable|date',
            'closing_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('ats_positions')->insertGetId($data);
        $position = $this->getPosition($id)->getData();

        return response()->json($position, 201);
    }

    /**
     * Update position
     */
    public function updatePosition(Request $request, $id)
    {
        $position = DB::table('ats_positions')->where('id', $id)->first();
        if (!$position) {
            return response()->json(['message' => 'Position not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'status' => 'nullable|in:draft,open,closed,on_hold',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'posted_date' => 'nullable|date',
            'closing_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('ats_positions')->where('id', $id)->update($data);
        $position = $this->getPosition($id)->getData();

        return response()->json($position);
    }

    /**
     * Delete position
     */
    public function deletePosition($id)
    {
        $position = DB::table('ats_positions')->where('id', $id)->first();
        if (!$position) {
            return response()->json(['message' => 'Position not found'], 404);
        }

        DB::table('ats_positions')->where('id', $id)->delete();
        return response()->json(['message' => 'Position deleted successfully']);
    }

    /**
     * Get all candidates
     */
    public function getCandidates(Request $request)
    {
        $query = DB::table('ats_candidates')
            ->select('ats_candidates.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_candidates.position_id', '=', 'ats_positions.id')
            ->orderBy('ats_candidates.created_at', 'desc');

        if ($request->has('position_id')) {
            $query->where('ats_candidates.position_id', $request->position_id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('ats_candidates.status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('ats_candidates.first_name', 'like', "%{$search}%")
                  ->orWhere('ats_candidates.last_name', 'like', "%{$search}%")
                  ->orWhere('ats_candidates.email', 'like', "%{$search}%");
            });
        }

        $candidates = $query->paginate(20);
        return response()->json($candidates);
    }

    /**
     * Get single candidate
     */
    public function getCandidate($id)
    {
        $candidate = DB::table('ats_candidates')
            ->select('ats_candidates.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_candidates.position_id', '=', 'ats_positions.id')
            ->where('ats_candidates.id', $id)
            ->first();

        if (!$candidate) {
            return response()->json(['message' => 'Candidate not found'], 404);
        }

        return response()->json($candidate);
    }

    /**
     * Create candidate
     */
    public function createCandidate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'position_id' => 'nullable|exists:ats_positions,id',
            'status' => 'nullable|in:new,reviewing,shortlisted,interviewed,offered,rejected,hired',
            'cover_letter' => 'nullable|string',
            'notes' => 'nullable|string',
            'applied_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (!isset($data['applied_date'])) {
            $data['applied_date'] = now()->toDateString();
        }
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('ats_candidates')->insertGetId($data);
        $candidate = DB::table('ats_candidates')
            ->select('ats_candidates.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_candidates.position_id', '=', 'ats_positions.id')
            ->where('ats_candidates.id', $id)
            ->first();

        return response()->json($candidate, 201);
    }

    /**
     * Update candidate
     */
    public function updateCandidate(Request $request, $id)
    {
        $candidate = DB::table('ats_candidates')->where('id', $id)->first();
        if (!$candidate) {
            return response()->json(['message' => 'Candidate not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'position_id' => 'nullable|exists:ats_positions,id',
            'status' => 'nullable|in:new,reviewing,shortlisted,interviewed,offered,rejected,hired',
            'cover_letter' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('ats_candidates')->where('id', $id)->update($data);
        $candidate = DB::table('ats_candidates')
            ->select('ats_candidates.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_candidates.position_id', '=', 'ats_positions.id')
            ->where('ats_candidates.id', $id)
            ->first();

        return response()->json($candidate);
    }

    /**
     * Delete candidate
     */
    public function deleteCandidate($id)
    {
        $candidate = DB::table('ats_candidates')->where('id', $id)->first();
        if (!$candidate) {
            return response()->json(['message' => 'Candidate not found'], 404);
        }

        DB::table('ats_candidates')->where('id', $id)->delete();
        return response()->json(['message' => 'Candidate deleted successfully']);
    }

    /**
     * Get all interviews
     */
    public function getInterviews(Request $request)
    {
        $query = DB::table('ats_interviews')
            ->select('ats_interviews.*', 
                DB::raw("CONCAT(ats_candidates.first_name, ' ', ats_candidates.last_name) as candidate_name"),
                'ats_positions.title as position_title',
                DB::raw("CONCAT(users.name) as interviewer_name")
            )
            ->join('ats_candidates', 'ats_interviews.candidate_id', '=', 'ats_candidates.id')
            ->join('ats_positions', 'ats_interviews.position_id', '=', 'ats_positions.id')
            ->leftJoin('users', 'ats_interviews.interviewer_id', '=', 'users.id')
            ->orderBy('ats_interviews.scheduled_date', 'desc');

        if ($request->has('candidate_id')) {
            $query->where('ats_interviews.candidate_id', $request->candidate_id);
        }

        if ($request->has('position_id')) {
            $query->where('ats_interviews.position_id', $request->position_id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('ats_interviews.status', $request->status);
        }

        $interviews = $query->paginate(20);
        return response()->json($interviews);
    }

    /**
     * Create interview
     */
    public function createInterview(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:ats_candidates,id',
            'position_id' => 'required|exists:ats_positions,id',
            'interviewer_id' => 'nullable|exists:users,id',
            'interview_type' => 'required|in:phone,video,in-person,technical',
            'scheduled_date' => 'required|date',
            'scheduled_time' => 'required|string',
            'status' => 'nullable|in:scheduled,completed,cancelled,no_show',
            'notes' => 'nullable|string',
            'feedback' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('ats_interviews')->insertGetId($data);
        $interview = $this->getInterview($id)->getData();

        return response()->json($interview, 201);
    }

    /**
     * Get single interview
     */
    public function getInterview($id)
    {
        $interview = DB::table('ats_interviews')
            ->select('ats_interviews.*', 
                DB::raw("CONCAT(ats_candidates.first_name, ' ', ats_candidates.last_name) as candidate_name"),
                'ats_positions.title as position_title',
                DB::raw("CONCAT(users.name) as interviewer_name")
            )
            ->join('ats_candidates', 'ats_interviews.candidate_id', '=', 'ats_candidates.id')
            ->join('ats_positions', 'ats_interviews.position_id', '=', 'ats_positions.id')
            ->leftJoin('users', 'ats_interviews.interviewer_id', '=', 'users.id')
            ->where('ats_interviews.id', $id)
            ->first();

        if (!$interview) {
            return response()->json(['message' => 'Interview not found'], 404);
        }

        return response()->json($interview);
    }

    /**
     * Update interview
     */
    public function updateInterview(Request $request, $id)
    {
        $interview = DB::table('ats_interviews')->where('id', $id)->first();
        if (!$interview) {
            return response()->json(['message' => 'Interview not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'candidate_id' => 'sometimes|required|exists:ats_candidates,id',
            'position_id' => 'sometimes|required|exists:ats_positions,id',
            'interviewer_id' => 'nullable|exists:users,id',
            'interview_type' => 'sometimes|required|in:phone,video,in-person,technical',
            'scheduled_date' => 'sometimes|required|date',
            'scheduled_time' => 'sometimes|required|string',
            'status' => 'nullable|in:scheduled,completed,cancelled,no_show',
            'notes' => 'nullable|string',
            'feedback' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('ats_interviews')->where('id', $id)->update($data);
        $interview = $this->getInterview($id)->getData();

        return response()->json($interview);
    }

    /**
     * Delete interview
     */
    public function deleteInterview($id)
    {
        $interview = DB::table('ats_interviews')->where('id', $id)->first();
        if (!$interview) {
            return response()->json(['message' => 'Interview not found'], 404);
        }

        DB::table('ats_interviews')->where('id', $id)->delete();
        return response()->json(['message' => 'Interview deleted successfully']);
    }

    /**
     * Get all offers
     */
    public function getOffers(Request $request)
    {
        $query = DB::table('ats_offers')
            ->select('ats_offers.*', 
                DB::raw("CONCAT(ats_candidates.first_name, ' ', ats_candidates.last_name) as candidate_name"),
                'ats_positions.title as position_title'
            )
            ->join('ats_candidates', 'ats_offers.candidate_id', '=', 'ats_candidates.id')
            ->join('ats_positions', 'ats_offers.position_id', '=', 'ats_positions.id')
            ->orderBy('ats_offers.created_at', 'desc');

        if ($request->has('candidate_id')) {
            $query->where('ats_offers.candidate_id', $request->candidate_id);
        }

        if ($request->has('position_id')) {
            $query->where('ats_offers.position_id', $request->position_id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('ats_offers.status', $request->status);
        }

        $offers = $query->paginate(20);
        return response()->json($offers);
    }

    /**
     * Create offer
     */
    public function createOffer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:ats_candidates,id',
            'position_id' => 'required|exists:ats_positions,id',
            'salary' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'status' => 'nullable|in:pending,sent,accepted,rejected,expired',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('ats_offers')->insertGetId($data);
        $offer = $this->getOffer($id)->getData();

        return response()->json($offer, 201);
    }

    /**
     * Get single offer
     */
    public function getOffer($id)
    {
        $offer = DB::table('ats_offers')
            ->select('ats_offers.*', 
                DB::raw("CONCAT(ats_candidates.first_name, ' ', ats_candidates.last_name) as candidate_name"),
                'ats_positions.title as position_title'
            )
            ->join('ats_candidates', 'ats_offers.candidate_id', '=', 'ats_candidates.id')
            ->join('ats_positions', 'ats_offers.position_id', '=', 'ats_positions.id')
            ->where('ats_offers.id', $id)
            ->first();

        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        return response()->json($offer);
    }

    /**
     * Update offer
     */
    public function updateOffer(Request $request, $id)
    {
        $offer = DB::table('ats_offers')->where('id', $id)->first();
        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'candidate_id' => 'sometimes|required|exists:ats_candidates,id',
            'position_id' => 'sometimes|required|exists:ats_positions,id',
            'salary' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'status' => 'nullable|in:pending,sent,accepted,rejected,expired',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('ats_offers')->where('id', $id)->update($data);
        $offer = $this->getOffer($id)->getData();

        return response()->json($offer);
    }

    /**
     * Delete offer
     */
    public function deleteOffer($id)
    {
        $offer = DB::table('ats_offers')->where('id', $id)->first();
        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        DB::table('ats_offers')->where('id', $id)->delete();
        return response()->json(['message' => 'Offer deleted successfully']);
    }

    /**
     * Send offer
     */
    public function sendOffer($id)
    {
        $offer = DB::table('ats_offers')->where('id', $id)->first();
        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        DB::table('ats_offers')->where('id', $id)->update([
            'status' => 'sent',
            'sent_date' => now()->toDateString(),
            'updated_at' => now(),
        ]);

        $offer = $this->getOffer($id)->getData();
        return response()->json($offer);
    }

    /**
     * Accept offer
     */
    public function acceptOffer($id)
    {
        $offer = DB::table('ats_offers')->where('id', $id)->first();
        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        DB::table('ats_offers')->where('id', $id)->update([
            'status' => 'accepted',
            'response_date' => now()->toDateString(),
            'updated_at' => now(),
        ]);

        $offer = $this->getOffer($id)->getData();
        return response()->json($offer);
    }

    /**
     * Reject offer
     */
    public function rejectOffer(Request $request, $id)
    {
        $offer = DB::table('ats_offers')->where('id', $id)->first();
        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        DB::table('ats_offers')->where('id', $id)->update([
            'status' => 'rejected',
            'response_date' => now()->toDateString(),
            'updated_at' => now(),
        ]);

        $offer = $this->getOffer($id)->getData();
        return response()->json($offer);
    }

    // ============================================
    // HRM STORES (Prodavnice)
    // ============================================

    /**
     * Get all stores
     */
    public function getStores(Request $request)
    {
        try {
            $query = DB::table('hrm_stores')
                ->select('hrm_stores.*')
                ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_stores.department_id) as department_name')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_stores.store_manager_id) as manager_name')
                ->orderBy('hrm_stores.name', 'asc');

            // Check for soft deletes
            if (Schema::hasColumn('hrm_stores', 'deleted_at')) {
                $query->whereNull('hrm_stores.deleted_at');
            }

            if ($request->has('department_id')) {
                $query->where('hrm_stores.department_id', $request->department_id);
            }

            if ($request->has('is_active')) {
                $query->where('hrm_stores.is_active', $request->boolean('is_active'));
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('hrm_stores.name', 'like', "%{$search}%")
                      ->orWhere('hrm_stores.code', 'like', "%{$search}%");
                });
            }

            $stores = $query->get();
            return response()->json($stores);
        } catch (\Exception $e) {
            Log::error('Error fetching stores', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create store
     */
    public function createStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:hrm_stores,code',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'store_manager_id' => 'nullable|exists:users,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $data['is_active'] = $data['is_active'] ?? true;

        $id = DB::table('hrm_stores')->insertGetId($data);
        $store = DB::table('hrm_stores')
            ->select('hrm_stores.*')
            ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_stores.department_id) as department_name')
            ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_stores.store_manager_id) as manager_name')
            ->where('hrm_stores.id', $id)
            ->first();

        return response()->json($store, 201);
    }

    /**
     * Update store
     */
    public function updateStore(Request $request, $id)
    {
        $store = DB::table('hrm_stores')->where('id', $id)->first();
        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50|unique:hrm_stores,code,' . $id,
            'department_id' => 'nullable|exists:hrm_departments,id',
            'store_manager_id' => 'nullable|exists:users,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('hrm_stores')->where('id', $id)->update($data);

        $store = DB::table('hrm_stores')
            ->select('hrm_stores.*')
            ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_stores.department_id) as department_name')
            ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_stores.store_manager_id) as manager_name')
            ->where('hrm_stores.id', $id)
            ->first();

        return response()->json($store);
    }

    /**
     * Delete store
     */
    public function deleteStore($id)
    {
        $store = DB::table('hrm_stores')->where('id', $id)->first();
        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        DB::table('hrm_stores')->where('id', $id)->delete();
        return response()->json(['message' => 'Store deleted successfully']);
    }

    // ============================================
    // HRM WORK POSITIONS (Radna mjesta)
    // ============================================

    /**
     * Get all work positions
     */
    public function getWorkPositions(Request $request)
    {
        try {
            $query = DB::table('hrm_work_positions')
                ->select('hrm_work_positions.*')
                ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_work_positions.department_id) as department_name')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = hrm_work_positions.store_id) as store_name')
                ->orderBy('hrm_work_positions.name', 'asc');

            if ($request->has('department_id')) {
                $query->where('hrm_work_positions.department_id', $request->department_id);
            }

            if ($request->has('store_id')) {
                $query->where('hrm_work_positions.store_id', $request->store_id);
            }

            if ($request->has('is_active')) {
                $query->where('hrm_work_positions.is_active', $request->boolean('is_active'));
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('hrm_work_positions.name', 'like', "%{$search}%")
                      ->orWhere('hrm_work_positions.code', 'like', "%{$search}%");
                });
            }

            $positions = $query->get();
            return response()->json($positions);
        } catch (\Exception $e) {
            Log::error('Error fetching work positions', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create work position
     */
    public function createWorkPosition(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:hrm_work_positions,code',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'store_id' => 'nullable|exists:hrm_stores,id',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'max_employees' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $data['is_active'] = $data['is_active'] ?? true;
        $data['employment_type'] = $data['employment_type'] ?? 'full-time';
        $data['current_employees'] = 0;

        $id = DB::table('hrm_work_positions')->insertGetId($data);
        $position = DB::table('hrm_work_positions')
            ->select('hrm_work_positions.*')
            ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_work_positions.department_id) as department_name')
            ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = hrm_work_positions.store_id) as store_name')
            ->where('hrm_work_positions.id', $id)
            ->first();

        return response()->json($position, 201);
    }

    /**
     * Update work position
     */
    public function updateWorkPosition(Request $request, $id)
    {
        $position = DB::table('hrm_work_positions')->where('id', $id)->first();
        if (!$position) {
            return response()->json(['message' => 'Work position not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50|unique:hrm_work_positions,code,' . $id,
            'department_id' => 'nullable|exists:hrm_departments,id',
            'store_id' => 'nullable|exists:hrm_stores,id',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'employment_type' => 'nullable|in:full-time,part-time,contract,intern',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'max_employees' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['updated_at'] = now();

        DB::table('hrm_work_positions')->where('id', $id)->update($data);

        $position = DB::table('hrm_work_positions')
            ->select('hrm_work_positions.*')
            ->selectRaw('(SELECT name FROM hrm_departments WHERE hrm_departments.id = hrm_work_positions.department_id) as department_name')
            ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = hrm_work_positions.store_id) as store_name')
            ->where('hrm_work_positions.id', $id)
            ->first();

        return response()->json($position);
    }

    /**
     * Delete work position
     */
    public function deleteWorkPosition($id)
    {
        $position = DB::table('hrm_work_positions')->where('id', $id)->first();
        if (!$position) {
            return response()->json(['message' => 'Work position not found'], 404);
        }

        DB::table('hrm_work_positions')->where('id', $id)->delete();
        return response()->json(['message' => 'Work position deleted successfully']);
    }

    // ==================== ONBOARDING ====================

    /**
     * List onboarding processes with optional status filter
     */
    public function getOnboardingProcesses(Request $request)
    {
        $query = DB::table('hrm_onboarding_processes')
            ->select(
                'hrm_onboarding_processes.*',
                'users.name as employee_name',
                'hrm_onboarding_templates.name as template_name'
            )
            ->leftJoin('hrm_employees', 'hrm_onboarding_processes.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_onboarding_templates', 'hrm_onboarding_processes.template_id', '=', 'hrm_onboarding_templates.id')
            ->orderBy('hrm_onboarding_processes.start_date', 'desc');

        if ($request->filled('status')) {
            $query->where('hrm_onboarding_processes.status', $request->input('status'));
        }

        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginated = $query->paginate($perPage);
        $items = collect($paginated->items())->map(function ($row) {
            return [
                'id' => $row->id,
                'employee_id' => $row->employee_id,
                'employee_name' => $row->employee_name,
                'template_id' => $row->template_id,
                'template_name' => $row->template_name,
                'status' => $row->status,
                'start_date' => $row->start_date,
                'target_completion_date' => $row->expected_completion_date,
                'completed_date' => $row->actual_completion_date,
                'progress_percentage' => (int) $row->progress_percentage,
                'notes' => $row->notes,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        });

        return response()->json([
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Get onboarding templates with task count (and tasks for template detail)
     */
    public function getOnboardingTemplates()
    {
        $templates = DB::table('hrm_onboarding_templates')
            ->where('is_active', 1)
            ->orderBy('name')
            ->get();

        $result = $templates->map(function ($t) {
            $tasks = DB::table('hrm_onboarding_template_tasks')
                ->where('template_id', $t->id)
                ->orderBy('order')
                ->get()
                ->map(function ($tt) {
                    return [
                        'id' => $tt->id,
                        'template_id' => $tt->template_id,
                        'name' => $tt->title,
                        'description' => $tt->description,
                        'category' => $tt->category ?? '',
                        'default_responsible_role' => $tt->responsible_role,
                        'days_from_start' => (int) $tt->due_days,
                        'is_required' => (bool) $tt->is_required,
                        'sort_order' => (int) $tt->order,
                    ];
                });
            return [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'is_active' => (bool) $t->is_active,
                'tasks' => $tasks,
            ];
        });

        return response()->json($result);
    }

    /**
     * Start a new onboarding process for an employee using a template
     */
    public function startOnboardingProcess(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'template_id' => 'required|exists:hrm_onboarding_templates,id',
            'start_date' => 'nullable|date',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeId = (int) $request->input('employee_id');
        $templateId = (int) $request->input('template_id');
        $startDate = $request->input('start_date') ?: now()->format('Y-m-d');

        // Check for existing in-progress process for this employee
        $existing = DB::table('hrm_onboarding_processes')
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['not_started', 'in_progress'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Zaposlenik već ima aktivan onboarding proces.'], 422);
        }

        $templateTasks = DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $templateId)
            ->orderBy('order')
            ->get();

        $processId = DB::table('hrm_onboarding_processes')->insertGetId([
            'employee_id' => $employeeId,
            'template_id' => $templateId,
            'start_date' => $startDate,
            'expected_completion_date' => null,
            'actual_completion_date' => null,
            'status' => 'in_progress',
            'progress_percentage' => 0,
            'notes' => null,
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($templateTasks as $tt) {
            $dueDate = now()->parse($startDate)->addDays((int) $tt->due_days)->format('Y-m-d');
            DB::table('hrm_onboarding_tasks')->insert([
                'process_id' => $processId,
                'template_task_id' => $tt->id,
                'title' => $tt->title,
                'description' => $tt->description,
                'order' => $tt->order,
                'due_date' => $dueDate,
                'status' => 'pending',
                'category' => $tt->category,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $process = $this->getOnboardingProcessRow($processId);
        return response()->json($process, 201);
    }

    /**
     * Get single onboarding process
     */
    public function getOnboardingProcess($id)
    {
        $process = $this->getOnboardingProcessRow($id);
        if (!$process) {
            return response()->json(['message' => 'Onboarding proces nije pronađen.'], 404);
        }
        return response()->json($process);
    }

    private function getOnboardingProcessRow($id)
    {
        $row = DB::table('hrm_onboarding_processes')
            ->select(
                'hrm_onboarding_processes.*',
                'users.name as employee_name',
                'hrm_onboarding_templates.name as template_name'
            )
            ->leftJoin('hrm_employees', 'hrm_onboarding_processes.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_onboarding_templates', 'hrm_onboarding_processes.template_id', '=', 'hrm_onboarding_templates.id')
            ->where('hrm_onboarding_processes.id', $id)
            ->first();

        if (!$row) {
            return null;
        }
        return [
            'id' => $row->id,
            'employee_id' => $row->employee_id,
            'employee_name' => $row->employee_name,
            'template_id' => $row->template_id,
            'template_name' => $row->template_name,
            'status' => $row->status,
            'start_date' => $row->start_date,
            'target_completion_date' => $row->expected_completion_date,
            'completed_date' => $row->actual_completion_date,
            'progress_percentage' => (int) $row->progress_percentage,
            'notes' => $row->notes,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    /**
     * Get tasks for an onboarding process
     */
    public function getOnboardingProcessTasks($id)
    {
        $process = DB::table('hrm_onboarding_processes')->where('id', $id)->first();
        if (!$process) {
            return response()->json(['message' => 'Onboarding proces nije pronađen.'], 404);
        }

        $tasks = DB::table('hrm_onboarding_tasks')
            ->select(
                'hrm_onboarding_tasks.*',
                'assigned_user.name as responsible_name'
            )
            ->leftJoin('users as assigned_user', 'hrm_onboarding_tasks.assigned_to', '=', 'assigned_user.id')
            ->where('hrm_onboarding_tasks.process_id', $id)
            ->orderBy('hrm_onboarding_tasks.order')
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'process_id' => $t->process_id,
                    'name' => $t->title,
                    'description' => $t->description,
                    'category' => $t->category ?? '',
                    'responsible_id' => $t->assigned_to,
                    'responsible_name' => $t->responsible_name,
                    'due_date' => $t->due_date,
                    'completed_date' => $t->completed_at ? \Carbon\Carbon::parse($t->completed_at)->format('Y-m-d') : null,
                    'status' => $t->status,
                    'sort_order' => (int) $t->order,
                    'notes' => $t->notes,
                ];
            });

        return response()->json($tasks);
    }

    /**
     * Update a single onboarding task (status, assigned_to, notes, completed_at)
     */
    public function updateOnboardingTask(Request $request, $id, $taskId)
    {
        $task = DB::table('hrm_onboarding_tasks')
            ->where('process_id', $id)
            ->where('id', $taskId)
            ->first();
        if (!$task) {
            return response()->json(['message' => 'Zadatak nije pronađen.'], 404);
        }

        $data = [];
        if ($request->has('status')) {
            $data['status'] = $request->input('status');
            if ($request->input('status') === 'completed') {
                $data['completed_at'] = now();
                $data['completed_by'] = $request->user()?->id;
            }
        }
        if ($request->has('assigned_to')) {
            $data['assigned_to'] = $request->input('assigned_to') ?: null;
        }
        if ($request->has('notes')) {
            $data['notes'] = $request->input('notes');
        }
        if (!empty($data)) {
            $data['updated_at'] = now();
            DB::table('hrm_onboarding_tasks')->where('id', $taskId)->update($data);
        }

        // Recalculate process progress
        $this->recalculateOnboardingProgress((int) $id);

        $taskList = DB::table('hrm_onboarding_tasks')
            ->select('hrm_onboarding_tasks.*', 'assigned_user.name as responsible_name')
            ->leftJoin('users as assigned_user', 'hrm_onboarding_tasks.assigned_to', '=', 'assigned_user.id')
            ->where('hrm_onboarding_tasks.process_id', $id)
            ->orderBy('hrm_onboarding_tasks.order')
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'process_id' => $t->process_id,
                    'name' => $t->title,
                    'description' => $t->description,
                    'category' => $t->category ?? '',
                    'responsible_id' => $t->assigned_to,
                    'responsible_name' => $t->responsible_name,
                    'due_date' => $t->due_date,
                    'completed_date' => $t->completed_at ? \Carbon\Carbon::parse($t->completed_at)->format('Y-m-d') : null,
                    'status' => $t->status,
                    'sort_order' => (int) $t->order,
                    'notes' => $t->notes,
                ];
            });
        return response()->json($taskList);
    }

    /**
     * Update onboarding process status (e.g. completed, cancelled)
     */
    public function updateOnboardingProcessStatus(Request $request, $id)
    {
        $process = DB::table('hrm_onboarding_processes')->where('id', $id)->first();
        if (!$process) {
            return response()->json(['message' => 'Onboarding proces nije pronađen.'], 404);
        }

        $status = $request->input('status');
        if (!in_array($status, ['not_started', 'in_progress', 'completed', 'cancelled'], true)) {
            return response()->json(['message' => 'Neispravan status.'], 422);
        }

        $update = ['status' => $status, 'updated_at' => now()];
        if ($status === 'completed') {
            $update['actual_completion_date'] = now()->format('Y-m-d');
            $update['progress_percentage'] = 100;
        }
        DB::table('hrm_onboarding_processes')->where('id', $id)->update($update);

        $process = $this->getOnboardingProcessRow($id);
        return response()->json($process);
    }

    private function recalculateOnboardingProgress(int $processId)
    {
        $total = DB::table('hrm_onboarding_tasks')->where('process_id', $processId)->count();
        if ($total === 0) {
            return;
        }
        $completed = DB::table('hrm_onboarding_tasks')
            ->where('process_id', $processId)
            ->where('status', 'completed')
            ->count();
        $percentage = (int) round(($completed / $total) * 100);
        DB::table('hrm_onboarding_processes')
            ->where('id', $processId)
            ->update([
                'progress_percentage' => $percentage,
                'actual_completion_date' => $percentage === 100 ? now()->format('Y-m-d') : null,
                'status' => $percentage === 100 ? 'completed' : 'in_progress',
                'updated_at' => now(),
            ]);
    }
}

