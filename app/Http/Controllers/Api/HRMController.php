<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\EmployeesImport;

class HRMController extends Controller
{
    /**
     * Base query for non-deleted employees.
     */
    private function employeesQuery()
    {
        $query = DB::table('hrm_employees');

        if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
            $query->whereNull('hrm_employees.deleted_at');
        }

        return $query;
    }

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
            $stats['total_employees'] = $this->employeesQuery()->count();
            $stats['active_employees'] = $this->employeesQuery()->where('status', 'active')->count();

            if (Schema::hasTable('hrm_offboarding_processes')) {
                $stats['offboarding_in_progress'] = DB::table('hrm_offboarding_processes')
                    ->whereIn('status', ['initiated', 'in_progress'])
                    ->count();
            } else {
                $stats['offboarding_in_progress'] = $this->employeesQuery()->where('status', 'offboarding')->count();
            }

            if (Schema::hasColumn('hrm_employees', 'hire_date')) {
                $stats['new_hires_this_month'] = $this->employeesQuery()
                    ->whereBetween('hire_date', [$monthStart, $monthEnd])
                    ->count();

                $stats['upcoming_anniversaries'] = $this->employeesQuery()
                    ->whereNotNull('hire_date')
                    ->whereRaw("DATE_FORMAT(hire_date, '%m-%d') between ? and ?", [
                        now()->format('m-d'),
                        now()->copy()->addDays(30)->format('m-d'),
                    ])
                    ->count();

                $newHires = $this->employeesQuery()
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
                $stats['terminations_this_month'] = $this->employeesQuery()
                    ->whereBetween('termination_date', [$monthStart, $monthEnd])
                    ->count();
            }

            if (Schema::hasColumn('hrm_employees', 'date_of_birth')) {
                $stats['upcoming_birthdays'] = $this->employeesQuery()
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
            $contractsQuery = DB::table('hrm_employment_contracts')
                ->where('hrm_employment_contracts.status', 'active')
                ->whereNotNull('hrm_employment_contracts.expiry_date')
                ->whereBetween('hrm_employment_contracts.expiry_date', [$today, now()->addDays($noticeDays)->toDateString()]);

            if (Schema::hasTable('hrm_employees') && Schema::hasColumn('hrm_employees', 'deleted_at')) {
                $contractsQuery
                    ->join('hrm_employees', 'hrm_employment_contracts.employee_id', '=', 'hrm_employees.id')
                    ->whereNull('hrm_employees.deleted_at');
            }

            $stats['expiring_contracts'] = $contractsQuery->count();
        } elseif (Schema::hasColumn('hrm_employees', 'probation_end_date')) {
            $expiringProbation = $this->employeesQuery()
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
            $leaveBase = DB::table('hrm_leaves')
                ->join('hrm_employees', 'hrm_leaves.employee_id', '=', 'hrm_employees.id');
            if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
                $leaveBase->whereNull('hrm_employees.deleted_at');
            }

            $stats['pending_leaves'] = (clone $leaveBase)->where('hrm_leaves.status', 'pending')->count();
            $stats['on_leave_today'] = (clone $leaveBase)
                ->where('hrm_leaves.status', 'approved')
                ->whereDate('hrm_leaves.start_date', '<=', $today)
                ->whereDate('hrm_leaves.end_date', '>=', $today)
                ->count();

            $pendingLeaves = DB::table('hrm_leaves')
                ->select('hrm_leaves.id', 'hrm_leaves.start_date', 'hrm_leaves.end_date', 'users.name')
                ->join('hrm_employees', 'hrm_leaves.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('hrm_leaves.status', 'pending')
                ->when(Schema::hasColumn('hrm_employees', 'deleted_at'), fn ($q) => $q->whereNull('hrm_employees.deleted_at'))
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
                ->when(Schema::hasColumn('hrm_employees', 'deleted_at'), fn ($q) => $q->where(function ($inner) {
                    $inner->whereNull('hrm_employees.id')
                        ->orWhereNull('hrm_employees.deleted_at');
                }))
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
        $nameExpr = "COALESCE(users.name, hrm_employees.employee_id, CONCAT('Zaposlenik #', hrm_employees.id))";
        if (Schema::hasColumn('hrm_employees', 'first_name') && Schema::hasColumn('hrm_employees', 'last_name')) {
            $nameExpr = "COALESCE(users.name, NULLIF(TRIM(CONCAT(COALESCE(hrm_employees.first_name, ''), ' ', COALESCE(hrm_employees.last_name, ''))), ''), hrm_employees.employee_id, CONCAT('Zaposlenik #', hrm_employees.id))";
        }

        $query = DB::table('hrm_employees')
            ->select(
                'hrm_employees.*',
                DB::raw("{$nameExpr} as name"),
                'users.email',
                'hrm_departments.name as department_name'
            )
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->orderByRaw("{$nameExpr} asc");

        // Check for soft deletes
        if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
            $query->whereNull('hrm_employees.deleted_at');
        }

        if ($request->filled('department_id')) {
            $query->where('hrm_employees.department_id', $request->input('department_id'));
        }

        if ($request->filled('status')) {
            $query->where('hrm_employees.status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search, $nameExpr) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('hrm_employees.employee_id', 'like', "%{$search}%")
                    ->orWhere('hrm_employees.position', 'like', "%{$search}%")
                    ->orWhereRaw("{$nameExpr} like ?", ["%{$search}%"]);
                if (Schema::hasColumn('hrm_employees', 'first_name')) {
                    $q->orWhere('hrm_employees.first_name', 'like', "%{$search}%")
                        ->orWhere('hrm_employees.last_name', 'like', "%{$search}%");
                }
            });
        }

        if ($request->filled('position')) {
            $position = $request->input('position');
            $query->where(function ($q) use ($position) {
                $q->where('hrm_employees.position', 'like', '%' . $position . '%');
                if (Schema::hasColumn('hrm_employees', 'job_title')) {
                    $q->orWhere('hrm_employees.job_title', 'like', '%' . $position . '%');
                }
            });
            $employees = $query->get();
            return response()->json($employees);
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 200);
        $employees = $query->paginate($perPage);

        return response()->json($employees);
    }

    /**
     * Users from Administration for linking to HR employees.
     * Returns all users by default (with is_linked flag). Pass include_linked=0 to hide already-linked.
     */
    public function getAvailableUsers(Request $request)
    {
        try {
            $linkedQuery = DB::table('hrm_employees')->whereNotNull('user_id');
            if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
                $linkedQuery->whereNull('deleted_at');
            }
            // Normalize to int keys so is_linked matching is reliable
            $linkedIds = $linkedQuery->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
            $linkedSet = array_fill_keys($linkedIds, true);

            $includeUserId = $request->filled('include_user_id')
                ? (int) $request->input('include_user_id')
                : null;

            // Default TRUE: always show Admin users in the picker (linked ones flagged).
            // Only hide linked when client explicitly sends include_linked=0/false.
            $includeLinked = true;
            if ($request->exists('include_linked')) {
                $raw = $request->input('include_linked');
                $includeLinked = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($includeLinked === null) {
                    $includeLinked = !in_array((string) $raw, ['0', 'false', 'no', 'off', ''], true);
                }
            }

            $select = ['users.id', 'users.name', 'users.email', 'users.created_at'];
            foreach (['phone', 'position', 'department', 'avatar', 'is_active'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $select[] = 'users.' . $col;
                }
            }

            $query = DB::table('users')->select($select)->orderBy('users.name');

            if (Schema::hasColumn('users', 'deleted_at')) {
                $query->whereNull('users.deleted_at');
            }

            if (!$includeLinked) {
                $query->where(function ($q) use ($linkedIds, $includeUserId) {
                    if (count($linkedIds) > 0) {
                        $q->whereNotIn('users.id', $linkedIds);
                    }
                    if ($includeUserId) {
                        $q->orWhere('users.id', $includeUserId);
                    }
                });
            }

            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('users.name', 'like', "%{$search}%")
                            ->orWhere('users.email', 'like', "%{$search}%");
                    });
                }
            }

            // active_only defaults to false so picker matches Administration list.
            // Only filter when client explicitly asks for active users.
            $activeOnly = false;
            if ($request->exists('active_only')) {
                $rawActive = $request->input('active_only');
                $parsed = filter_var($rawActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $activeOnly = $parsed === null
                    ? !in_array((string) $rawActive, ['0', 'false', 'no', 'off', ''], true)
                    : $parsed;
            }

            if ($activeOnly && Schema::hasColumn('users', 'is_active')) {
                $query->where(function ($q) {
                    $q->where('users.is_active', 1)
                        ->orWhere('users.is_active', true)
                        ->orWhereNull('users.is_active');
                });
            }

            $limit = min(max((int) $request->input('limit', 1000), 1), 2000);
            $users = $query->limit($limit)->get()->map(function ($u) use ($linkedSet, $includeUserId) {
                $id = (int) $u->id;
                $isLinked = isset($linkedSet[$id]) && $id !== (int) $includeUserId;
                return [
                    'id' => $id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'phone' => $u->phone ?? null,
                    'position' => $u->position ?? null,
                    'department' => $u->department ?? null,
                    'avatar' => $u->avatar ?? null,
                    'is_active' => isset($u->is_active) ? (bool) $u->is_active : true,
                    'is_linked' => $isLinked,
                    'created_at' => $u->created_at,
                ];
            })->values();

            return response()->json($users);
        } catch (\Throwable $e) {
            Log::error('getAvailableUsers failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju korisnika iz Administracije.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get single employee
     */
    public function show($id)
    {
        $query = DB::table('hrm_employees')
            ->select(
                'hrm_employees.*',
                'users.name as user_name',
                'users.email as user_email',
                'hrm_departments.name as department_name'
            )
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->where('hrm_employees.id', $id);

        if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
            $query->whereNull('hrm_employees.deleted_at');
        }

        $employee = $query->first();

        if (!$employee) {
            return response()->json(['message' => 'Zaposlenik nije pronađen'], 404);
        }

        $employee = (array) $employee;
        $fallbackName = null;
        if (Schema::hasColumn('hrm_employees', 'first_name') || array_key_exists('first_name', $employee)) {
            $fallbackName = trim(($employee['first_name'] ?? '') . ' ' . ($employee['last_name'] ?? ''));
        }
        $employee['name'] = $employee['user_name']
            ?: ($fallbackName ?: null)
            ?: ($employee['employee_id'] ?? null)
            ?: ('Zaposlenik #' . $id);
        $employee['email'] = $employee['user_email']
            ?? $employee['email']
            ?? null;
        $employee['employee_number'] = $employee['employee_id'] ?? $employee['employee_number'] ?? null;

        return response()->json($employee);
    }

    /**
     * Create employee
     */
    public function store(Request $request)
    {
        $linkUserId = $request->filled('user_id') ? (int) $request->input('user_id') : null;

        $emailRules = ['required', 'email'];
        if ($linkUserId) {
            // Allow existing Admin user's email when linking
            $emailRules[] = 'unique:users,email,' . $linkUserId;
        } else {
            $emailRules[] = 'unique:users,email';
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => $emailRules,
            'employee_number' => 'required|string|unique:hrm_employees,employee_id',
            'user_id' => 'nullable|exists:users,id|unique:hrm_employees,user_id',
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
        $userId = $data['user_id'] ?? null;

        if ($userId) {
            $existingUser = DB::table('users')->where('id', $userId)->first();
            if (!$existingUser) {
                return response()->json(['message' => 'Korisnik nije pronađen.'], 404);
            }

            $alreadyLinked = DB::table('hrm_employees')->where('user_id', $userId)->exists();
            if ($alreadyLinked) {
                return response()->json(['message' => 'Korisnik je već povezan sa drugim zaposlenikom.'], 422);
            }

            // Sync name / email / phone from form onto the Admin user
            $userUpdate = [
                'name' => trim($data['first_name'] . ' ' . $data['last_name']),
                'email' => $data['email'],
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('users', 'phone') && !empty($data['mobile_phone'])) {
                $userUpdate['phone'] = $data['mobile_phone'];
            }
            if (Schema::hasColumn('users', 'position') && !empty($data['position'])) {
                $userUpdate['position'] = $data['position'];
            }
            DB::table('users')->where('id', $userId)->update($userUpdate);
        } else {
            $userInsert = [
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'email' => $data['email'],
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('users', 'phone') && !empty($data['mobile_phone'])) {
                $userInsert['phone'] = $data['mobile_phone'];
            }
            if (Schema::hasColumn('users', 'position') && !empty($data['position'])) {
                $userInsert['position'] = $data['position'];
            }
            $userId = DB::table('users')->insertGetId($userInsert);
        }

        $employeeData = [
            'user_id' => $userId,
            'employee_id' => $data['employee_number'],
            'municipality_code' => $data['municipality_code'] ?? null,
            'department_id' => $data['department_id'] ?? null,
            'position' => $data['position'],
            'job_title' => $data['job_title'] ?? null,
            'store' => $data['store'] ?? null,
            'gender' => $data['gender'] ?? null,
            'employment_type' => $data['employment_type'] ?? 'full-time',
            'hire_date' => $data['hire_date'],
            'phone' => $data['mobile_phone'] ?? null,
            'mobile_phone' => $data['mobile_phone'] ?? null,
            'address' => $data['private_address'] ?? null,
            'private_address' => $data['private_address'] ?? null,
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

        $linkUserId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $emailIgnoreId = $linkUserId ?: $employee->user_id;

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $emailIgnoreId,
            'employee_number' => 'sometimes|required|string|unique:hrm_employees,employee_id,' . $id,
            'user_id' => [
                'nullable',
                'exists:users,id',
                Rule::unique('hrm_employees', 'user_id')->ignore($id),
            ],
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

        // Link / change Admin user
        if (array_key_exists('user_id', $data) && $data['user_id'] && (int) $data['user_id'] !== (int) $employee->user_id) {
            $employeeData['user_id'] = (int) $data['user_id'];
            $employee->user_id = (int) $data['user_id'];
        }

        if (isset($data['first_name']) || isset($data['last_name']) || isset($data['email']) || isset($data['mobile_phone'])) {
            if (isset($data['first_name']) || isset($data['last_name'])) {
                $currentUser = DB::table('users')->where('id', $employee->user_id)->first();
                $firstName = $data['first_name'] ?? explode(' ', $currentUser->name ?? '')[0];
                $lastName = $data['last_name'] ?? (explode(' ', $currentUser->name ?? '', 2)[1] ?? '');
                $userData['name'] = trim($firstName . ' ' . $lastName);
            }
            if (isset($data['email'])) {
                $userData['email'] = $data['email'];
            }
            if (isset($data['mobile_phone']) && Schema::hasColumn('users', 'phone')) {
                $userData['phone'] = $data['mobile_phone'];
            }
            if (!empty($userData) && $employee->user_id) {
                $userData['updated_at'] = now();
                DB::table('users')->where('id', $employee->user_id)->update($userData);
            }
        }

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
                    $employeeData['phone'] = $data['mobile_phone'];
                } elseif ($inputField === 'private_address') {
                    $employeeData['private_address'] = $data['private_address'];
                    $employeeData['address'] = $data['private_address'];
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
            return response()->json(['message' => 'Zaposlenik nije pronađen'], 404);
        }

        try {
            DB::beginTransaction();

            // Clear self-references (manager/mentor) so FK does not block delete
            if (Schema::hasColumn('hrm_employees', 'manager_id')) {
                DB::table('hrm_employees')->where('manager_id', $id)->update(['manager_id' => null]);
            }
            if (Schema::hasColumn('hrm_employees', 'mentor_id')) {
                DB::table('hrm_employees')->where('mentor_id', $id)->update(['mentor_id' => null]);
            }

            if (Schema::hasColumn('hrm_employees', 'deleted_at')) {
                DB::table('hrm_employees')
                    ->where('id', $id)
                    ->update(['deleted_at' => now(), 'updated_at' => now()]);
            } else {
                DB::table('hrm_employees')->where('id', $id)->delete();
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error deleting employee: ' . $e->getMessage(), ['employee_id' => $id]);
            return response()->json([
                'message' => 'Greška pri brisanju zaposlenika. Provjerite da li postoje povezani zapisi.',
            ], 500);
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
                ->selectRaw(
                    Schema::hasColumn('hrm_employees', 'deleted_at')
                        ? "(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id AND hrm_employees.deleted_at IS NULL) as employees_count"
                        : "(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id) as employees_count"
                )
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
                ->selectRaw(
                    Schema::hasColumn('hrm_employees', 'deleted_at')
                        ? "(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id AND hrm_employees.deleted_at IS NULL) as employees_count"
                        : "(SELECT COUNT(*) FROM hrm_employees WHERE hrm_employees.department_id = hrm_departments.id) as employees_count"
                )
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
        $employeesCount = $this->employeesQuery()->where('department_id', $id)->count();
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

        $candidate->interviews = DB::table('ats_interviews')
            ->select('ats_interviews.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_interviews.position_id', '=', 'ats_positions.id')
            ->where('ats_interviews.candidate_id', $id)
            ->orderByDesc('ats_interviews.scheduled_date')
            ->get();

        $candidate->offers = DB::table('ats_offers')
            ->select('ats_offers.*', 'ats_positions.title as position_title')
            ->leftJoin('ats_positions', 'ats_offers.position_id', '=', 'ats_positions.id')
            ->where('ats_offers.candidate_id', $id)
            ->orderByDesc('ats_offers.created_at')
            ->get();

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

        $status = $data['status'] ?? 'scheduled';
        $this->syncAtsCandidateStatus(
            (int) $data['candidate_id'],
            $status === 'completed' ? 'interviewed' : 'shortlisted'
        );

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

        $candidateId = (int) ($data['candidate_id'] ?? $interview->candidate_id);
        $newStatus = $data['status'] ?? $interview->status;
        if ($newStatus === 'completed') {
            $this->syncAtsCandidateStatus($candidateId, 'interviewed');
        } elseif (in_array($newStatus, ['scheduled', 'no_show'], true)) {
            $this->syncAtsCandidateStatus($candidateId, 'shortlisted');
        }

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

        $offerStatus = $data['status'] ?? 'pending';
        if ($offerStatus === 'accepted') {
            $this->syncAtsCandidateStatus((int) $data['candidate_id'], 'hired');
        } elseif ($offerStatus === 'rejected') {
            $this->syncAtsCandidateStatus((int) $data['candidate_id'], 'rejected');
        } else {
            $this->syncAtsCandidateStatus((int) $data['candidate_id'], 'offered');
        }

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

        $candidateId = (int) ($data['candidate_id'] ?? $offer->candidate_id);
        $offerStatus = $data['status'] ?? $offer->status;
        if ($offerStatus === 'accepted') {
            $this->syncAtsCandidateStatus($candidateId, 'hired');
        } elseif ($offerStatus === 'rejected') {
            $this->syncAtsCandidateStatus($candidateId, 'rejected');
        } elseif (in_array($offerStatus, ['pending', 'sent'], true)) {
            $this->syncAtsCandidateStatus($candidateId, 'offered');
        }

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

        $this->syncAtsCandidateStatus((int) $offer->candidate_id, 'offered');

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

        $this->syncAtsCandidateStatus((int) $offer->candidate_id, 'hired');

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

        $this->syncAtsCandidateStatus((int) $offer->candidate_id, 'rejected');

        $offer = $this->getOffer($id)->getData();
        return response()->json($offer);
    }

    /**
     * Advance ATS candidate pipeline status without downgrading terminal states incorrectly.
     */
    private function syncAtsCandidateStatus(int $candidateId, string $newStatus): void
    {
        if (!Schema::hasTable('ats_candidates')) {
            return;
        }

        $candidate = DB::table('ats_candidates')->where('id', $candidateId)->first();
        if (!$candidate) {
            return;
        }

        $rank = [
            'new' => 1,
            'reviewing' => 2,
            'shortlisted' => 3,
            'interviewed' => 4,
            'offered' => 5,
            'hired' => 6,
            'rejected' => 0,
        ];

        $current = $candidate->status ?? 'new';

        // Terminal outcomes always apply
        if (in_array($newStatus, ['hired', 'rejected'], true)) {
            DB::table('ats_candidates')->where('id', $candidateId)->update([
                'status' => $newStatus,
                'updated_at' => now(),
            ]);
            return;
        }

        // Do not move backward from hired
        if ($current === 'hired') {
            return;
        }

        $currentRank = $rank[$current] ?? 0;
        $newRank = $rank[$newStatus] ?? 0;
        if ($newRank > $currentRank) {
            DB::table('ats_candidates')->where('id', $candidateId)->update([
                'status' => $newStatus,
                'updated_at' => now(),
            ]);
        }
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
    public function getOnboardingTemplates(Request $request)
    {
        $query = DB::table('hrm_onboarding_templates')->orderBy('name');
        if (!$request->boolean('all')) {
            $query->where('is_active', 1);
        }

        $templates = $query->get();

        $result = $templates->map(function ($t) {
            return $this->mapOnboardingTemplate($t);
        });

        return response()->json($result);
    }

    private function mapOnboardingTemplate($t): array
    {
        $tasks = DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $t->id)
            ->orderBy('order')
            ->get()
            ->map(function ($tt) {
                return $this->mapOnboardingTemplateTask($tt);
            });

        return [
            'id' => $t->id,
            'name' => $t->name,
            'description' => $t->description,
            'is_active' => (bool) $t->is_active,
            'tasks' => $tasks,
        ];
    }

    private function mapOnboardingTemplateTask($tt): array
    {
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
    }

    /**
     * Create onboarding template (checklist container for options)
     */
    public function createOnboardingTemplate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $id = DB::table('hrm_onboarding_templates')->insertGetId([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'is_active' => $request->boolean('is_active', true) ? 1 : 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $template = DB::table('hrm_onboarding_templates')->where('id', $id)->first();
        return response()->json($this->mapOnboardingTemplate($template), 201);
    }

    /**
     * Update onboarding template
     */
    public function updateOnboardingTemplate(Request $request, $id)
    {
        $template = DB::table('hrm_onboarding_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Predložak nije pronađen.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = [];
        if ($request->has('name')) {
            $data['name'] = $request->input('name');
        }
        if ($request->has('description')) {
            $data['description'] = $request->input('description');
        }
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active') ? 1 : 0;
        }
        if (!empty($data)) {
            $data['updated_at'] = now();
            DB::table('hrm_onboarding_templates')->where('id', $id)->update($data);
        }

        $template = DB::table('hrm_onboarding_templates')->where('id', $id)->first();
        return response()->json($this->mapOnboardingTemplate($template));
    }

    /**
     * Add an option (template task) to an onboarding template
     */
    public function createOnboardingTemplateTask(Request $request, $id)
    {
        $template = DB::table('hrm_onboarding_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Predložak nije pronađen.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'default_responsible_role' => 'nullable|string|max:100',
            'days_from_start' => 'nullable|integer|min:0|max:365',
            'is_required' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $maxOrder = (int) DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $id)
            ->max('order');

        $taskId = DB::table('hrm_onboarding_template_tasks')->insertGetId([
            'template_id' => $id,
            'title' => $request->input('name'),
            'description' => $request->input('description'),
            'category' => $request->input('category') ?: 'default',
            'responsible_role' => $request->input('default_responsible_role'),
            'due_days' => (int) $request->input('days_from_start', 0),
            'is_required' => $request->boolean('is_required', false) ? 1 : 0,
            'order' => $request->filled('sort_order') ? (int) $request->input('sort_order') : $maxOrder + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $task = DB::table('hrm_onboarding_template_tasks')->where('id', $taskId)->first();
        return response()->json($this->mapOnboardingTemplateTask($task), 201);
    }

    /**
     * Update an onboarding template option
     */
    public function updateOnboardingTemplateTask(Request $request, $id, $taskId)
    {
        $task = DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $id)
            ->where('id', $taskId)
            ->first();
        if (!$task) {
            return response()->json(['message' => 'Opcija nije pronađena.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'default_responsible_role' => 'nullable|string|max:100',
            'days_from_start' => 'nullable|integer|min:0|max:365',
            'is_required' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = [];
        if ($request->has('name')) {
            $data['title'] = $request->input('name');
        }
        if ($request->has('description')) {
            $data['description'] = $request->input('description');
        }
        if ($request->has('category')) {
            $data['category'] = $request->input('category') ?: 'default';
        }
        if ($request->has('default_responsible_role')) {
            $data['responsible_role'] = $request->input('default_responsible_role');
        }
        if ($request->has('days_from_start')) {
            $data['due_days'] = (int) $request->input('days_from_start');
        }
        if ($request->has('is_required')) {
            $data['is_required'] = $request->boolean('is_required') ? 1 : 0;
        }
        if ($request->has('sort_order')) {
            $data['order'] = (int) $request->input('sort_order');
        }
        if (!empty($data)) {
            $data['updated_at'] = now();
            DB::table('hrm_onboarding_template_tasks')->where('id', $taskId)->update($data);
        }

        $task = DB::table('hrm_onboarding_template_tasks')->where('id', $taskId)->first();
        return response()->json($this->mapOnboardingTemplateTask($task));
    }

    /**
     * Delete an onboarding template option
     */
    public function deleteOnboardingTemplateTask($id, $taskId)
    {
        $task = DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $id)
            ->where('id', $taskId)
            ->first();
        if (!$task) {
            return response()->json(['message' => 'Opcija nije pronađena.'], 404);
        }

        DB::table('hrm_onboarding_template_tasks')->where('id', $taskId)->delete();
        return response()->json(['message' => 'Opcija je obrisana.']);
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
            'task_ids' => 'nullable|array',
            'task_ids.*' => 'integer|exists:hrm_onboarding_template_tasks,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeId = (int) $request->input('employee_id');
        $templateId = (int) $request->input('template_id');
        $startDate = $request->input('start_date') ?: now()->format('Y-m-d');
        $selectedTaskIds = $request->input('task_ids');

        // Check for existing in-progress process for this employee
        $existing = DB::table('hrm_onboarding_processes')
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['not_started', 'in_progress'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Zaposlenik već ima aktivan onboarding proces.'], 422);
        }

        $templateTasksQuery = DB::table('hrm_onboarding_template_tasks')
            ->where('template_id', $templateId)
            ->orderBy('order');

        // Ako su proslijeđeni task_ids, uključi samo odabrane opcije
        if (is_array($selectedTaskIds)) {
            if (count($selectedTaskIds) === 0) {
                return response()->json(['message' => 'Odaberite barem jednu onboarding opciju.'], 422);
            }
            $templateTasksQuery->whereIn('id', $selectedTaskIds);
        }

        $templateTasks = $templateTasksQuery->get();
        if ($templateTasks->isEmpty()) {
            return response()->json(['message' => 'Predložak nema odabranih opcija.'], 422);
        }

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
            $status = $request->input('status');
            if (!in_array($status, ['pending', 'in_progress', 'completed', 'skipped'], true)) {
                return response()->json(['message' => 'Neispravan status zadatka.'], 422);
            }
            $data['status'] = $status;
            if ($status === 'completed') {
                $data['completed_at'] = now();
                $data['completed_by'] = $request->user()?->id;
            } else {
                $data['completed_at'] = null;
                $data['completed_by'] = null;
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
        $active = DB::table('hrm_onboarding_tasks')
            ->where('process_id', $processId)
            ->where('status', '!=', 'skipped')
            ->count();

        if ($active === 0) {
            // Sve opcije isključene / preskočene
            DB::table('hrm_onboarding_processes')
                ->where('id', $processId)
                ->update([
                    'progress_percentage' => 100,
                    'actual_completion_date' => now()->format('Y-m-d'),
                    'status' => 'completed',
                    'updated_at' => now(),
                ]);
            return;
        }

        $completed = DB::table('hrm_onboarding_tasks')
            ->where('process_id', $processId)
            ->where('status', 'completed')
            ->count();

        $percentage = (int) round(($completed / $active) * 100);
        DB::table('hrm_onboarding_processes')
            ->where('id', $processId)
            ->update([
                'progress_percentage' => $percentage,
                'actual_completion_date' => $percentage === 100 ? now()->format('Y-m-d') : null,
                'status' => $percentage === 100 ? 'completed' : 'in_progress',
                'updated_at' => now(),
            ]);
    }

    // ============================================
    // OFFBOARDING (uses existing DB column names)
    // ============================================

    private function mapReasonTypeFromCode(?string $code): string
    {
        $code = strtolower((string) $code);
        if (str_contains($code, 'resign')) {
            return 'resignation';
        }
        if (str_contains($code, 'termin')) {
            return 'termination';
        }
        if (str_contains($code, 'expir') || str_contains($code, 'contract')) {
            return 'contract_expiry';
        }
        if (str_contains($code, 'mutual')) {
            return 'mutual_agreement';
        }
        if (str_contains($code, 'retir')) {
            return 'retirement';
        }
        return $code ?: 'resignation';
    }

    public function getOffboardingProcesses(Request $request)
    {
        if (!Schema::hasTable('hrm_offboarding_processes')) {
            return response()->json(['data' => [], 'current_page' => 1, 'last_page' => 1, 'per_page' => 15, 'total' => 0]);
        }

        $query = DB::table('hrm_offboarding_processes')
            ->select(
                'hrm_offboarding_processes.*',
                'users.name as employee_name',
                'hrm_offboarding_reasons.name as reason_name',
                'hrm_offboarding_reasons.code as reason_code'
            )
            ->leftJoin('hrm_employees', 'hrm_offboarding_processes.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_offboarding_reasons', 'hrm_offboarding_processes.reason_id', '=', 'hrm_offboarding_reasons.id')
            ->orderByDesc('hrm_offboarding_processes.notification_date')
            ->orderByDesc('hrm_offboarding_processes.id');

        if ($request->filled('status')) {
            $query->where('hrm_offboarding_processes.status', $request->input('status'));
        }
        if ($request->filled('employee_id')) {
            $query->where('hrm_offboarding_processes.employee_id', (int) $request->input('employee_id'));
        }

        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginated = $query->paginate($perPage);
        $items = collect($paginated->items())->map(fn ($row) => $this->mapOffboardingProcess($row));

        return response()->json([
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    public function getOffboardingReasons()
    {
        if (!Schema::hasTable('hrm_offboarding_reasons')) {
            return response()->json([]);
        }

        $reasons = DB::table('hrm_offboarding_reasons')
            ->where('is_active', 1)
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'code' => $r->code,
                'reason_type' => $this->mapReasonTypeFromCode($r->code),
                'description' => $r->description,
                'is_active' => (bool) $r->is_active,
            ]);

        return response()->json($reasons);
    }

    public function getOffboardingChecklistItems()
    {
        if (!Schema::hasTable('hrm_offboarding_checklist_items')) {
            return response()->json([]);
        }

        $items = DB::table('hrm_offboarding_checklist_items')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->title,
                'title' => $i->title,
                'description' => $i->description,
                'category' => $i->category,
                'due_days' => (int) $i->due_days,
                'is_required' => (bool) $i->is_required,
                'sort_order' => (int) $i->sort_order,
            ]);

        return response()->json($items);
    }

    public function initiateOffboarding(Request $request)
    {
        if (!Schema::hasTable('hrm_offboarding_processes')) {
            return response()->json(['message' => 'Offboarding tabele nisu kreirane. Pokrenite migracije.'], 503);
        }

        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'reason_id' => 'required|exists:hrm_offboarding_reasons,id',
            'last_working_date' => 'required|date',
            'notes' => 'nullable|string',
            'checklist_item_ids' => 'nullable|array',
            'checklist_item_ids.*' => 'integer|exists:hrm_offboarding_checklist_items,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeId = (int) $request->input('employee_id');
        $reasonId = (int) $request->input('reason_id');
        $lastWorkingDate = $request->input('last_working_date');
        $selectedIds = $request->input('checklist_item_ids');

        $existing = DB::table('hrm_offboarding_processes')
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['initiated', 'in_progress', 'pending'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Zaposlenik već ima aktivan offboarding proces.'], 422);
        }

        $reason = DB::table('hrm_offboarding_reasons')->where('id', $reasonId)->first();
        if (!$reason) {
            return response()->json(['message' => 'Razlog nije pronađen.'], 404);
        }

        $itemsQuery = DB::table('hrm_offboarding_checklist_items')
            ->where('is_active', 1)
            ->orderBy('sort_order');

        if (is_array($selectedIds)) {
            if (count($selectedIds) === 0) {
                return response()->json(['message' => 'Odaberite barem jednu stavku checkliste.'], 422);
            }
            $itemsQuery->whereIn('id', $selectedIds);
        }

        $checklistItems = $itemsQuery->get();
        if ($checklistItems->isEmpty()) {
            return response()->json(['message' => 'Nema aktivnih stavki checkliste za offboarding.'], 422);
        }

        $processId = DB::table('hrm_offboarding_processes')->insertGetId([
            'employee_id' => $employeeId,
            'reason_id' => $reasonId,
            'notification_date' => now()->format('Y-m-d'),
            'last_working_day' => $lastWorkingDate,
            'status' => 'in_progress',
            'progress_percentage' => 0,
            'exit_interview_completed' => 0,
            'exit_interview_notes' => null,
            'notes' => $request->input('notes'),
            'initiated_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($checklistItems as $item) {
            $dueDate = now()->parse($lastWorkingDate)->addDays((int) $item->due_days)->format('Y-m-d');
            DB::table('hrm_offboarding_tasks')->insert([
                'process_id' => $processId,
                'title' => $item->title,
                'description' => $item->description,
                'category' => $item->category,
                'due_date' => $dueDate,
                'status' => 'pending',
                'order' => (int) $item->sort_order,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $employeeUpdate = ['status' => 'offboarding', 'updated_at' => now()];
        if (Schema::hasColumn('hrm_employees', 'termination_date')) {
            $employeeUpdate['termination_date'] = $lastWorkingDate;
        }
        DB::table('hrm_employees')->where('id', $employeeId)->update($employeeUpdate);

        return response()->json($this->getOffboardingProcessRow($processId), 201);
    }

    public function getOffboardingProcess($id)
    {
        $process = $this->getOffboardingProcessRow($id);
        if (!$process) {
            return response()->json(['message' => 'Offboarding proces nije pronađen.'], 404);
        }
        return response()->json($process);
    }

    public function getOffboardingProcessTasks($id)
    {
        $process = DB::table('hrm_offboarding_processes')->where('id', $id)->first();
        if (!$process) {
            return response()->json(['message' => 'Offboarding proces nije pronađen.'], 404);
        }

        return response()->json($this->listOffboardingTasks((int) $id));
    }

    public function updateOffboardingTask(Request $request, $id, $taskId)
    {
        $task = DB::table('hrm_offboarding_tasks')
            ->where('process_id', $id)
            ->where('id', $taskId)
            ->first();
        if (!$task) {
            return response()->json(['message' => 'Zadatak nije pronađen.'], 404);
        }

        $data = [];
        if ($request->has('status')) {
            $status = $request->input('status');
            if (!in_array($status, ['pending', 'in_progress', 'completed', 'skipped'], true)) {
                return response()->json(['message' => 'Neispravan status zadatka.'], 422);
            }
            $data['status'] = $status;
            if ($status === 'completed') {
                $data['completed_at'] = now();
                $data['completed_by'] = $request->user()?->id;
            } else {
                $data['completed_at'] = null;
                $data['completed_by'] = null;
            }
        }
        if ($request->has('notes')) {
            $data['notes'] = $request->input('notes');
        }
        if ($request->has('assigned_to')) {
            $data['assigned_to'] = $request->input('assigned_to') ?: null;
        }
        if (!empty($data)) {
            $data['updated_at'] = now();
            DB::table('hrm_offboarding_tasks')->where('id', $taskId)->update($data);
        }

        $this->recalculateOffboardingProgress((int) $id);

        return response()->json($this->listOffboardingTasks((int) $id));
    }

    public function completeOffboarding(Request $request, $id)
    {
        $process = DB::table('hrm_offboarding_processes')->where('id', $id)->first();
        if (!$process) {
            return response()->json(['message' => 'Offboarding proces nije pronađen.'], 404);
        }
        if ($process->status === 'completed') {
            return response()->json($this->getOffboardingProcessRow($id));
        }
        if ($process->status === 'cancelled') {
            return response()->json(['message' => 'Otkazani proces se ne može završiti.'], 422);
        }

        $pendingRequired = DB::table('hrm_offboarding_tasks')
            ->where('process_id', $id)
            ->whereNotIn('status', ['completed', 'skipped'])
            ->count();

        $force = $request->boolean('force', false);
        if ($pendingRequired > 0 && !$force) {
            return response()->json([
                'message' => 'Postoje nezavršeni zadaci. Označite ih kao završene/preskočene ili pošaljite force=1.',
                'pending_tasks' => $pendingRequired,
            ], 422);
        }

        if ($force && $pendingRequired > 0) {
            DB::table('hrm_offboarding_tasks')
                ->where('process_id', $id)
                ->whereNotIn('status', ['completed', 'skipped'])
                ->update([
                    'status' => 'skipped',
                    'updated_at' => now(),
                ]);
        }

        DB::table('hrm_offboarding_processes')->where('id', $id)->update([
            'status' => 'completed',
            'progress_percentage' => 100,
            'updated_at' => now(),
        ]);

        $employeeUpdate = ['status' => 'former', 'updated_at' => now()];
        if (Schema::hasColumn('hrm_employees', 'termination_date') && $process->last_working_day) {
            $employeeUpdate['termination_date'] = $process->last_working_day;
        }
        DB::table('hrm_employees')->where('id', $process->employee_id)->update($employeeUpdate);

        return response()->json($this->getOffboardingProcessRow($id));
    }

    public function updateOffboardingProcessStatus(Request $request, $id)
    {
        $process = DB::table('hrm_offboarding_processes')->where('id', $id)->first();
        if (!$process) {
            return response()->json(['message' => 'Offboarding proces nije pronađen.'], 404);
        }

        $status = $request->input('status');
        if (!in_array($status, ['initiated', 'in_progress', 'completed', 'cancelled'], true)) {
            return response()->json(['message' => 'Neispravan status.'], 422);
        }

        $update = ['status' => $status, 'updated_at' => now()];
        if ($status === 'completed') {
            $update['progress_percentage'] = 100;
            DB::table('hrm_employees')->where('id', $process->employee_id)->update([
                'status' => 'former',
                'termination_date' => $process->last_working_day,
                'updated_at' => now(),
            ]);
        } elseif ($status === 'cancelled') {
            $emp = DB::table('hrm_employees')->where('id', $process->employee_id)->first();
            if ($emp && $emp->status === 'offboarding') {
                DB::table('hrm_employees')->where('id', $process->employee_id)->update([
                    'status' => 'active',
                    'updated_at' => now(),
                ]);
            }
        }

        DB::table('hrm_offboarding_processes')->where('id', $id)->update($update);

        return response()->json($this->getOffboardingProcessRow($id));
    }

    private function getOffboardingProcessRow($id): ?array
    {
        $row = DB::table('hrm_offboarding_processes')
            ->select(
                'hrm_offboarding_processes.*',
                'users.name as employee_name',
                'hrm_offboarding_reasons.name as reason_name',
                'hrm_offboarding_reasons.code as reason_code'
            )
            ->leftJoin('hrm_employees', 'hrm_offboarding_processes.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_offboarding_reasons', 'hrm_offboarding_processes.reason_id', '=', 'hrm_offboarding_reasons.id')
            ->where('hrm_offboarding_processes.id', $id)
            ->first();

        if (!$row) {
            return null;
        }

        return $this->mapOffboardingProcess($row);
    }

    private function mapOffboardingProcess($row): array
    {
        return [
            'id' => $row->id,
            'employee_id' => $row->employee_id,
            'employee_name' => $row->employee_name,
            'reason_id' => $row->reason_id,
            'reason_name' => $row->reason_name,
            'reason_type' => $this->mapReasonTypeFromCode($row->reason_code ?? null),
            'initiated_date' => $row->notification_date,
            'last_working_date' => $row->last_working_day,
            'status' => $row->status,
            'progress_percentage' => (int) ($row->progress_percentage ?? 0),
            'notes' => $row->notes,
            'exit_interview_date' => null,
            'exit_interview_notes' => $row->exit_interview_notes,
            'completed_date' => $row->status === 'completed' ? ($row->updated_at ? \Carbon\Carbon::parse($row->updated_at)->format('Y-m-d') : null) : null,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    private function listOffboardingTasks(int $processId)
    {
        return DB::table('hrm_offboarding_tasks')
            ->select(
                'hrm_offboarding_tasks.*',
                'assigned_user.name as responsible_name'
            )
            ->leftJoin('users as assigned_user', 'hrm_offboarding_tasks.assigned_to', '=', 'assigned_user.id')
            ->where('hrm_offboarding_tasks.process_id', $processId)
            ->orderBy('hrm_offboarding_tasks.order')
            ->orderBy('hrm_offboarding_tasks.id')
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
                    'completed_date' => $t->completed_at
                        ? \Carbon\Carbon::parse($t->completed_at)->format('Y-m-d')
                        : null,
                    'status' => $t->status,
                    'sort_order' => (int) $t->order,
                    'notes' => $t->notes,
                ];
            });
    }

    private function recalculateOffboardingProgress(int $processId): void
    {
        $active = DB::table('hrm_offboarding_tasks')
            ->where('process_id', $processId)
            ->where('status', '!=', 'skipped')
            ->count();

        if ($active === 0) {
            DB::table('hrm_offboarding_processes')->where('id', $processId)->update([
                'progress_percentage' => 100,
                'updated_at' => now(),
            ]);
            return;
        }

        $completed = DB::table('hrm_offboarding_tasks')
            ->where('process_id', $processId)
            ->where('status', 'completed')
            ->count();

        $percentage = (int) round(($completed / $active) * 100);
        DB::table('hrm_offboarding_processes')->where('id', $processId)->update([
            'progress_percentage' => $percentage,
            'updated_at' => now(),
        ]);
    }

    /**
     * Aggregated analytics for HR Reports dashboard.
     */
    public function getReportsOverview(Request $request)
    {
        $months = max(3, min((int) $request->input('months', 12), 24));
        $start = now()->copy()->subMonths($months - 1)->startOfMonth();

        $kpis = [
            'total_employees' => 0,
            'active_employees' => 0,
            'new_hires_this_month' => 0,
            'terminations_this_month' => 0,
            'onboarding_in_progress' => 0,
            'offboarding_in_progress' => 0,
            'avg_tenure_months' => 0,
            'departments_count' => 0,
        ];

        $byStatus = [];
        $byDepartment = [];
        $byPosition = [];
        $byEmploymentType = [];
        $byGender = [];
        $hiresVsExits = [];
        $headcountTrend = [];
        $offboardingReasons = [];

        if (!Schema::hasTable('hrm_employees')) {
            return response()->json(compact(
                'kpis', 'byStatus', 'byDepartment', 'byPosition', 'byEmploymentType',
                'byGender', 'hiresVsExits', 'headcountTrend', 'offboardingReasons'
            ));
        }

        $empBase = $this->employeesQuery();
        $kpis['total_employees'] = (clone $empBase)->count();
        $kpis['active_employees'] = (clone $empBase)->where('status', 'active')->count();

        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        if (Schema::hasColumn('hrm_employees', 'hire_date')) {
            $kpis['new_hires_this_month'] = (clone $empBase)
                ->whereBetween('hire_date', [$monthStart, $monthEnd])
                ->count();

            $avgDays = (clone $empBase)
                ->whereNotNull('hire_date')
                ->where('status', 'active')
                ->selectRaw('AVG(DATEDIFF(CURDATE(), hire_date)) as avg_days')
                ->value('avg_days');
            $kpis['avg_tenure_months'] = $avgDays ? round(((float) $avgDays) / 30.44, 1) : 0;
        }

        if (Schema::hasColumn('hrm_employees', 'termination_date')) {
            $kpis['terminations_this_month'] = (clone $empBase)
                ->whereBetween('termination_date', [$monthStart, $monthEnd])
                ->count();
        }

        if (Schema::hasTable('hrm_onboarding_processes')) {
            $kpis['onboarding_in_progress'] = DB::table('hrm_onboarding_processes')
                ->whereIn('status', ['pending', 'in_progress', 'active', 'not_started'])
                ->count();
        }

        if (Schema::hasTable('hrm_offboarding_processes')) {
            $kpis['offboarding_in_progress'] = DB::table('hrm_offboarding_processes')
                ->whereIn('status', ['initiated', 'in_progress'])
                ->count();
        } else {
            $kpis['offboarding_in_progress'] = (clone $empBase)->where('status', 'offboarding')->count();
        }

        if (Schema::hasTable('hrm_departments')) {
            $kpis['departments_count'] = DB::table('hrm_departments')->count();
        }

        $statusLabels = [
            'active' => 'Aktivni',
            'candidate' => 'Kandidati',
            'hiring' => 'Zapošljavanje',
            'on_hold' => 'Na čekanju',
            'offboarding' => 'Offboarding',
            'former' => 'Bivši',
            'on-leave' => 'Na odsustvu',
            'terminated' => 'Prekinuto',
        ];
        $statusColors = [
            'active' => '#0d9488',
            'candidate' => '#6366f1',
            'hiring' => '#2563eb',
            'on_hold' => '#f59e0b',
            'offboarding' => '#ea580c',
            'former' => '#64748b',
            'on-leave' => '#0891b2',
            'terminated' => '#dc2626',
        ];

        $byStatus = $this->employeesQuery()
            ->select('status', DB::raw('COUNT(*) as value'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => [
                'key' => $r->status,
                'name' => $statusLabels[$r->status] ?? $r->status,
                'value' => (int) $r->value,
                'color' => $statusColors[$r->status] ?? '#94a3b8',
            ])
            ->values()
            ->all();

        $byDepartment = $this->employeesQuery()
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->select(DB::raw("COALESCE(NULLIF(hrm_departments.name, ''), 'Bez odjela') as name"), DB::raw('COUNT(*) as value'))
            ->groupBy('name')
            ->orderByDesc('value')
            ->limit(12)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'value' => (int) $r->value])
            ->values()
            ->all();

        $byPosition = $this->employeesQuery()
            ->select(DB::raw("COALESCE(NULLIF(position, ''), 'Nepoznato') as name"), DB::raw('COUNT(*) as value'))
            ->groupBy('name')
            ->orderByDesc('value')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'value' => (int) $r->value])
            ->values()
            ->all();

        if (Schema::hasColumn('hrm_employees', 'employment_type')) {
            $typeLabels = [
                'full-time' => 'Puno vrijeme',
                'part-time' => 'Djelimično',
                'contract' => 'Ugovor',
                'intern' => 'Praksa',
            ];
            $byEmploymentType = $this->employeesQuery()
                ->select(
                    DB::raw("COALESCE(NULLIF(employment_type, ''), 'Nepoznato') as type_key"),
                    DB::raw('COUNT(*) as value')
                )
                ->groupBy('type_key')
                ->get()
                ->map(fn ($r) => [
                    'name' => $typeLabels[$r->type_key] ?? $r->type_key,
                    'value' => (int) $r->value,
                ])
                ->values()
                ->all();
        }

        if (Schema::hasColumn('hrm_employees', 'gender')) {
            $genderLabels = ['M' => 'Muški', 'F' => 'Ženski'];
            $byGender = $this->employeesQuery()
                ->whereNotNull('gender')
                ->where('gender', '!=', '')
                ->select('gender as gender_key', DB::raw('COUNT(*) as value'))
                ->groupBy('gender_key')
                ->get()
                ->map(fn ($r) => [
                    'name' => $genderLabels[$r->gender_key] ?? $r->gender_key,
                    'value' => (int) $r->value,
                ])
                ->values()
                ->all();
        }

        // Monthly hires / exits
        $hiresMap = [];
        $exitsMap = [];
        if (Schema::hasColumn('hrm_employees', 'hire_date')) {
            $hiresMap = $this->employeesQuery()
                ->whereNotNull('hire_date')
                ->where('hire_date', '>=', $start->toDateString())
                ->select(DB::raw("DATE_FORMAT(hire_date, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
                ->groupBy('ym')
                ->pluck('c', 'ym')
                ->all();
        }
        if (Schema::hasColumn('hrm_employees', 'termination_date')) {
            $exitsMap = $this->employeesQuery()
                ->whereNotNull('termination_date')
                ->where('termination_date', '>=', $start->toDateString())
                ->select(DB::raw("DATE_FORMAT(termination_date, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
                ->groupBy('ym')
                ->pluck('c', 'ym')
                ->all();
        }
        // Also count completed offboarding by last_working_day
        if (Schema::hasTable('hrm_offboarding_processes') && Schema::hasColumn('hrm_offboarding_processes', 'last_working_day')) {
            $obExits = DB::table('hrm_offboarding_processes')
                ->where('status', 'completed')
                ->whereNotNull('last_working_day')
                ->where('last_working_day', '>=', $start->toDateString())
                ->select(DB::raw("DATE_FORMAT(last_working_day, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
                ->groupBy('ym')
                ->pluck('c', 'ym')
                ->all();
            foreach ($obExits as $ym => $c) {
                $exitsMap[$ym] = max((int) ($exitsMap[$ym] ?? 0), (int) $c);
            }
        }

        $cursor = $start->copy();
        $running = 0;
        // Approximate starting headcount: current - net change after start
        $netAfterStart = 0;
        for ($i = 0; $i < $months; $i++) {
            $ym = $cursor->format('Y-m');
            $h = (int) ($hiresMap[$ym] ?? 0);
            $e = (int) ($exitsMap[$ym] ?? 0);
            $netAfterStart += ($h - $e);
            $cursor->addMonth();
        }
        $running = max(0, $kpis['total_employees'] - $netAfterStart);

        $cursor = $start->copy();
        $monthNames = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
        for ($i = 0; $i < $months; $i++) {
            $ym = $cursor->format('Y-m');
            $h = (int) ($hiresMap[$ym] ?? 0);
            $e = (int) ($exitsMap[$ym] ?? 0);
            $running = max(0, $running + $h - $e);
            $label = $monthNames[(int) $cursor->format('n') - 1] . ' ' . $cursor->format('y');
            $hiresVsExits[] = [
                'month' => $label,
                'ym' => $ym,
                'hires' => $h,
                'exits' => $e,
            ];
            $headcountTrend[] = [
                'month' => $label,
                'ym' => $ym,
                'count' => $running,
            ];
            $cursor->addMonth();
        }

        if (Schema::hasTable('hrm_offboarding_processes') && Schema::hasTable('hrm_offboarding_reasons')) {
            $offboardingReasons = DB::table('hrm_offboarding_processes')
                ->leftJoin('hrm_offboarding_reasons', 'hrm_offboarding_processes.reason_id', '=', 'hrm_offboarding_reasons.id')
                ->select(DB::raw("COALESCE(hrm_offboarding_reasons.name, 'Nepoznato') as name"), DB::raw('COUNT(*) as value'))
                ->groupBy('name')
                ->orderByDesc('value')
                ->get()
                ->map(fn ($r) => ['name' => $r->name, 'value' => (int) $r->value])
                ->values()
                ->all();
        }

        return response()->json([
            'kpis' => $kpis,
            'by_status' => $byStatus,
            'by_department' => $byDepartment,
            'by_position' => $byPosition,
            'by_employment_type' => $byEmploymentType,
            'by_gender' => $byGender,
            'hires_vs_exits' => $hiresVsExits,
            'headcount_trend' => $headcountTrend,
            'offboarding_reasons' => $offboardingReasons,
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
