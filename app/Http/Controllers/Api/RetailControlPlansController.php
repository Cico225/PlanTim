<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class RetailControlPlansController extends Controller
{
    /**
     * Get overview statistics
     */
    public function getOverviewStats(Request $request)
    {
        try {
            $now = now();
            $startOfMonth = $now->copy()->startOfMonth();
            $endOfMonth = $now->copy()->endOfMonth();

            // Active plans count
            $activePlans = DB::table('retail_control_plans')
                ->where('status', 'active')
                ->count();

            // Controls this month (completed plan items)
            $controlsThisMonth = DB::table('retail_control_plan_items')
                ->where('status', 'completed')
                ->whereBetween('completed_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->count();

            // If completed_date is null, check planned_date
            $controlsThisMonthPlanned = DB::table('retail_control_plan_items')
                ->where('status', 'completed')
                ->whereNull('completed_date')
                ->whereBetween('planned_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->count();

            $controlsThisMonth = $controlsThisMonth + $controlsThisMonthPlanned;

            // Education plans this month - placeholder for now
            // TODO: Add education plans table when implemented
            $educationThisMonth = 0;

            // Evaluations this month - placeholder for now
            // TODO: Add evaluations table when implemented
            $evaluationsThisMonth = 0;

            // Total plans count
            $totalPlans = DB::table('retail_control_plans')->count();

            // Pending plan items (overdue or due soon)
            $pendingItems = DB::table('retail_control_plan_items')
                ->whereIn('status', ['pending', 'in_progress'])
                ->count();

            // Completed items count
            $completedItems = DB::table('retail_control_plan_items')
                ->where('status', 'completed')
                ->count();

            return response()->json([
                'active_plans' => $activePlans,
                'controls_this_month' => $controlsThisMonth,
                'education_this_month' => $educationThisMonth,
                'evaluations_this_month' => $evaluationsThisMonth,
                'total_plans' => $totalPlans,
                'pending_items' => $pendingItems,
                'completed_items' => $completedItems,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching retail overview stats', ['error' => $e->getMessage()]);
            return response()->json([
                'active_plans' => 0,
                'controls_this_month' => 0,
                'education_this_month' => 0,
                'evaluations_this_month' => 0,
                'total_plans' => 0,
                'pending_items' => 0,
                'completed_items' => 0,
            ], 500);
        }
    }

    /**
     * Get reports data for calendar and table view
     */
    public function getReports(Request $request)
    {
        try {
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $type = $request->input('type', 'all'); // 'all', 'plans', 'activities', 'educations'

            $now = now();
            $defaultStart = $startDate ?: $now->copy()->startOfMonth()->toDateString();
            $defaultEnd = $endDate ?: $now->copy()->endOfMonth()->toDateString();

            $reports = [];

            // Get plans
            if ($type === 'all' || $type === 'plans') {
                $plans = DB::table('retail_control_plans')
                    ->select('retail_control_plans.*')
                    ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
                    ->where(function($query) use ($defaultStart, $defaultEnd) {
                        $query->whereBetween('start_date', [$defaultStart, $defaultEnd])
                              ->orWhereBetween('end_date', [$defaultStart, $defaultEnd])
                              ->orWhereBetween('deadline', [$defaultStart, $defaultEnd])
                              ->orWhere(function($q) use ($defaultStart, $defaultEnd) {
                                  $q->whereNull('start_date')
                                    ->whereNull('end_date')
                                    ->whereYear('year', '>=', date('Y', strtotime($defaultStart)))
                                    ->whereYear('year', '<=', date('Y', strtotime($defaultEnd)));
                              });
                    })
                    ->orderBy('retail_control_plans.year', 'desc')
                    ->orderBy('retail_control_plans.start_date', 'asc')
                    ->get();

                foreach ($plans as $plan) {
                    $reports[] = [
                        'id' => $plan->id,
                        'type' => 'plan',
                        'title' => $plan->title,
                        'description' => $plan->description,
                        'date' => $plan->start_date ?? $plan->deadline ?? null,
                        'end_date' => $plan->end_date,
                        'deadline' => $plan->deadline,
                        'status' => $plan->status,
                        'plan_type' => $plan->type,
                        'regional_manager' => $plan->regional_manager_name,
                        'year' => $plan->year,
                    ];
                }
            }

            // Get plan items (activities)
            if ($type === 'all' || $type === 'activities') {
                $activities = DB::table('retail_control_plan_items')
                    ->select('retail_control_plan_items.*')
                    ->selectRaw('(SELECT title FROM retail_control_plans WHERE retail_control_plans.id = retail_control_plan_items.plan_id) as plan_title')
                    ->selectRaw('(SELECT type FROM retail_control_plans WHERE retail_control_plans.id = retail_control_plan_items.plan_id) as plan_type')
                    ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_name')
                    ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_code')
                    ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plan_items.assigned_to) as assigned_to_name')
                    ->whereBetween('planned_date', [$defaultStart, $defaultEnd])
                    ->orderBy('retail_control_plan_items.planned_date', 'asc')
                    ->get();

                foreach ($activities as $activity) {
                    $reports[] = [
                        'id' => $activity->id,
                        'type' => 'activity',
                        'title' => $activity->store_name . ($activity->store_code ? ' (' . $activity->store_code . ')' : ''),
                        'description' => $activity->plan_title . ' - ' . ($activity->notes ?? ''),
                        'date' => $activity->planned_date,
                        'end_date' => null,
                        'deadline' => null,
                        'completed_date' => $activity->completed_date,
                        'status' => $activity->status,
                        'plan_type' => $activity->plan_type,
                        'plan_title' => $activity->plan_title,
                        'store_name' => $activity->store_name,
                        'store_code' => $activity->store_code,
                        'assigned_to' => $activity->assigned_to_name,
                        'priority' => $activity->priority,
                        'plan_id' => $activity->plan_id,
                    ];
                }
            }

            // Get education plans
            if (($type === 'all' || $type === 'educations') && Schema::hasTable('retail_education_plans')) {
                try {
                    $educations = DB::table('retail_education_plans')
                        ->select('retail_education_plans.*')
                        ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_name')
                        ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_code')
                        ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.user_id) as employee_name')
                        ->selectRaw('(SELECT email FROM users WHERE users.id = hrm_employees.user_id) as employee_email')
                        ->selectRaw('(SELECT name FROM users WHERE users.id = retail_education_plans.instructor_id) as instructor_name')
                        ->join('hrm_employees', 'retail_education_plans.employee_id', '=', 'hrm_employees.id')
                        ->whereBetween('retail_education_plans.education_date', [$defaultStart, $defaultEnd])
                        ->orderBy('retail_education_plans.education_date', 'asc')
                        ->get();
                } catch (\Exception $e) {
                    // If table doesn't exist or error occurs, log and continue
                    Log::warning('Error fetching education plans for reports', ['error' => $e->getMessage()]);
                    $educations = collect([]);
                }

                foreach ($educations as $education) {
                    $reports[] = [
                        'id' => $education->id,
                        'type' => 'education',
                        'title' => $education->title,
                        'description' => $education->topic ? $education->topic . ($education->description ? ' - ' . $education->description : '') : $education->description,
                        'date' => $education->education_date,
                        'end_date' => null,
                        'deadline' => null,
                        'completed_date' => $education->completed_date,
                        'status' => $education->status,
                        'education_type' => $education->education_type,
                        'employee_name' => $education->employee_name,
                        'employee_email' => $education->employee_email,
                        'store_name' => $education->store_name,
                        'store_code' => $education->store_code,
                        'instructor_name' => $education->instructor_name,
                        'location' => $education->location,
                        'start_time' => $education->start_time,
                        'end_time' => $education->end_time,
                    ];
                }
            }

            // Sort by date
            usort($reports, function($a, $b) {
                $dateA = $a['date'] ?? '9999-12-31';
                $dateB = $b['date'] ?? '9999-12-31';
                return strcmp($dateA, $dateB);
            });

            return response()->json([
                'reports' => $reports,
                'start_date' => $defaultStart,
                'end_date' => $defaultEnd,
                'total' => count($reports),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching retail reports', ['error' => $e->getMessage()]);
            $now = now();
            return response()->json([
                'reports' => [],
                'start_date' => $now->copy()->startOfMonth()->toDateString(),
                'end_date' => $now->copy()->endOfMonth()->toDateString(),
                'total' => 0,
            ], 500);
        }
    }

    /**
     * Aggregated analytics for Retail Reports dashboard.
     */
    public function getReportsOverview(Request $request)
    {
        $months = max(3, min((int) $request->input('months', 12), 24));
        $start = now()->copy()->subMonths($months - 1)->startOfMonth();
        $startDate = $start->toDateString();
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $hasPlans = Schema::hasTable('retail_control_plans');
        $hasItems = Schema::hasTable('retail_control_plan_items');
        $hasRecords = Schema::hasTable('retail_control_records');
        $hasObservations = Schema::hasTable('retail_control_observations');
        $hasMeasures = Schema::hasTable('retail_control_measures');
        $hasEducations = Schema::hasTable('retail_education_plans');

        $kpis = [
            'active_plans' => 0,
            'total_plans' => 0,
            'activities_total' => 0,
            'activities_completed' => 0,
            'activities_open' => 0,
            'activities_overdue' => 0,
            'completion_rate' => 0,
            'controls_period' => 0,
            'controls_this_month' => 0,
            'controls_locked' => 0,
            'avg_store_rating' => 0,
            'inventory_difference' => 0,
            'inventory_shortages' => 0,
            'open_measures' => 0,
            'overdue_measures' => 0,
            'educations_period' => 0,
            'educations_this_month' => 0,
            'educations_completed' => 0,
            'stores_visited' => 0,
        ];

        $monthNames = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
        $monthKeys = [];
        $cursor = $start->copy();
        for ($i = 0; $i < $months; $i++) {
            $monthKeys[$cursor->format('Y-m')] = $monthNames[(int) $cursor->format('n') - 1] . ' ' . $cursor->format('y');
            $cursor->addMonth();
        }

        $monthlyCount = function ($query, string $column) use ($startDate) {
            return $query
                ->whereNotNull($column)
                ->where($column, '>=', $startDate)
                ->select(DB::raw("DATE_FORMAT($column, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
                ->groupBy('ym')
                ->pluck('c', 'ym')
                ->all();
        };

        $activityStatus = [];
        $plansByType = [];
        $activityTrend = [];
        $upcomingActivities = [];
        $managerPerformance = [];
        $controlsTrend = [];
        $observationsByCategory = [];
        $inventoryStatus = [];
        $storeRatings = [];
        $topStores = [];
        $measuresStatus = [];
        $educationTrend = [];
        $educationByType = [];

        $planTypeLabels = [
            'inventory_required' => 'Obavezna inventura',
            'inventory_extraordinary' => 'Vanredna inventura',
            'store_visit' => 'Obilazak prodavnice',
        ];

        if ($hasPlans) {
            $kpis['total_plans'] = DB::table('retail_control_plans')->count();
            $kpis['active_plans'] = DB::table('retail_control_plans')->where('status', 'active')->count();

            $plansByType = DB::table('retail_control_plans')
                ->select('type', DB::raw('COUNT(*) as value'))
                ->groupBy('type')
                ->get()
                ->map(fn ($r) => [
                    'key' => $r->type,
                    'name' => $planTypeLabels[$r->type] ?? $r->type,
                    'value' => (int) $r->value,
                ])
                ->values()
                ->all();
        }

        if ($hasItems) {
            $items = DB::table('retail_control_plan_items');
            $kpis['activities_total'] = (clone $items)->count();
            $kpis['activities_completed'] = (clone $items)->where('status', 'completed')->count();
            $kpis['activities_open'] = (clone $items)->whereIn('status', ['pending', 'in_progress', 'overdue'])->count();
            $kpis['activities_overdue'] = (clone $items)
                ->whereIn('status', ['pending', 'in_progress', 'overdue'])
                ->where('planned_date', '<', $today)
                ->count();
            $kpis['completion_rate'] = $kpis['activities_total'] > 0
                ? round($kpis['activities_completed'] / $kpis['activities_total'] * 100, 1)
                : 0;

            $statusLabels = [
                'pending' => 'Na čekanju',
                'in_progress' => 'U toku',
                'completed' => 'Završeno',
                'cancelled' => 'Otkazano',
                'overdue' => 'Kasni',
            ];
            $statusColors = [
                'pending' => '#94a3b8',
                'in_progress' => '#0284c7',
                'completed' => '#16a34a',
                'cancelled' => '#dc2626',
                'overdue' => '#ea580c',
            ];
            $statusCounts = [];
            DB::table('retail_control_plan_items')
                ->select('status', 'planned_date')
                ->orderBy('id')
                ->each(function ($r) use (&$statusCounts, $today) {
                    $key = in_array($r->status, ['pending', 'in_progress'], true) && $r->planned_date < $today
                        ? 'overdue'
                        : $r->status;
                    $statusCounts[$key] = ($statusCounts[$key] ?? 0) + 1;
                });
            foreach ($statusCounts as $key => $value) {
                $activityStatus[] = [
                    'key' => $key,
                    'name' => $statusLabels[$key] ?? $key,
                    'value' => $value,
                    'color' => $statusColors[$key] ?? '#64748b',
                ];
            }

            $plannedMap = $monthlyCount(DB::table('retail_control_plan_items'), 'planned_date');
            $completedMap = $monthlyCount(
                DB::table('retail_control_plan_items')->where('status', 'completed'),
                'completed_date'
            );
            foreach ($monthKeys as $ym => $label) {
                $activityTrend[] = [
                    'month' => $label,
                    'ym' => $ym,
                    'planned' => (int) ($plannedMap[$ym] ?? 0),
                    'completed' => (int) ($completedMap[$ym] ?? 0),
                ];
            }

            $upcomingActivities = DB::table('retail_control_plan_items')
                ->leftJoin('retail_control_plans', 'retail_control_plan_items.plan_id', '=', 'retail_control_plans.id')
                ->leftJoin('hrm_stores', 'retail_control_plan_items.store_id', '=', 'hrm_stores.id')
                ->leftJoin('users', 'retail_control_plan_items.assigned_to', '=', 'users.id')
                ->whereIn('retail_control_plan_items.status', ['pending', 'in_progress', 'overdue'])
                ->where('retail_control_plan_items.planned_date', '<=', now()->addDays(14)->toDateString())
                ->orderBy('retail_control_plan_items.planned_date')
                ->limit(8)
                ->get([
                    'retail_control_plan_items.id',
                    'retail_control_plan_items.plan_id',
                    'retail_control_plan_items.planned_date',
                    'retail_control_plan_items.status',
                    'retail_control_plans.title as plan_title',
                    'hrm_stores.name as store_name',
                    'hrm_stores.code as store_code',
                    'users.name as assigned_to_name',
                ])
                ->map(fn ($r) => [
                    'id' => (int) $r->id,
                    'plan_id' => (int) $r->plan_id,
                    'planned_date' => $r->planned_date,
                    'status' => $r->status,
                    'overdue' => $r->planned_date < $today,
                    'plan_title' => $r->plan_title,
                    'store_name' => $r->store_name ?: 'Nepoznata prodavnica',
                    'store_code' => $r->store_code,
                    'assigned_to_name' => $r->assigned_to_name,
                ])
                ->values()
                ->all();

            if ($hasPlans) {
                $managerPerformance = DB::table('retail_control_plan_items')
                    ->join('retail_control_plans', 'retail_control_plan_items.plan_id', '=', 'retail_control_plans.id')
                    ->leftJoin('users', 'retail_control_plans.regional_manager_id', '=', 'users.id')
                    ->select(
                        'retail_control_plans.regional_manager_id',
                        DB::raw('MAX(users.name) as name'),
                        DB::raw('COUNT(*) as total'),
                        DB::raw("SUM(CASE WHEN retail_control_plan_items.status = 'completed' THEN 1 ELSE 0 END) as completed")
                    )
                    ->groupBy('retail_control_plans.regional_manager_id')
                    ->orderByDesc('total')
                    ->limit(10)
                    ->get()
                    ->map(fn ($r) => [
                        'name' => $r->name ?: 'Bez menadžera',
                        'total' => (int) $r->total,
                        'completed' => (int) $r->completed,
                        'open' => (int) $r->total - (int) $r->completed,
                    ])
                    ->values()
                    ->all();
            }
        }

        if ($hasRecords) {
            $records = DB::table('retail_control_records');
            $kpis['controls_period'] = (clone $records)->where('control_date_from', '>=', $startDate)->count();
            $kpis['controls_this_month'] = (clone $records)->whereBetween('control_date_from', [$monthStart, $monthEnd])->count();
            $kpis['controls_locked'] = (clone $records)->whereIn('status', ['finalized', 'locked'])->count();
            $kpis['stores_visited'] = (clone $records)->where('control_date_from', '>=', $startDate)->distinct()->count('store_id');
            $avgRating = (clone $records)->whereNotNull('store_rating')->avg('store_rating');
            $kpis['avg_store_rating'] = $avgRating ? round((float) $avgRating, 1) : 0;
            $kpis['inventory_difference'] = round((float) (clone $records)
                ->where('control_type', 'total_inventory')
                ->where('control_date_from', '>=', $startDate)
                ->sum('total_difference'), 2);
            $kpis['inventory_shortages'] = (clone $records)
                ->where('inventory_status', 'shortage')
                ->where('control_date_from', '>=', $startDate)
                ->count();

            $inspectionMap = $monthlyCount(DB::table('retail_control_records')->where('control_type', 'inspection'), 'control_date_from');
            $inventoryMap = $monthlyCount(DB::table('retail_control_records')->where('control_type', 'total_inventory'), 'control_date_from');
            foreach ($monthKeys as $ym => $label) {
                $controlsTrend[] = [
                    'month' => $label,
                    'ym' => $ym,
                    'inspection' => (int) ($inspectionMap[$ym] ?? 0),
                    'inventory' => (int) ($inventoryMap[$ym] ?? 0),
                ];
            }

            $inventoryLabels = [
                'no_difference' => 'Bez razlike',
                'shortage' => 'Manjak',
                'surplus' => 'Višak',
            ];
            $inventoryColors = [
                'no_difference' => '#16a34a',
                'shortage' => '#dc2626',
                'surplus' => '#f59e0b',
            ];
            $inventoryStatus = DB::table('retail_control_records')
                ->where('control_type', 'total_inventory')
                ->whereNotNull('inventory_status')
                ->select('inventory_status', DB::raw('COUNT(*) as value'))
                ->groupBy('inventory_status')
                ->get()
                ->map(fn ($r) => [
                    'key' => $r->inventory_status,
                    'name' => $inventoryLabels[$r->inventory_status] ?? $r->inventory_status,
                    'value' => (int) $r->value,
                    'color' => $inventoryColors[$r->inventory_status] ?? '#64748b',
                ])
                ->values()
                ->all();

            $ratingCounts = DB::table('retail_control_records')
                ->whereNotNull('store_rating')
                ->select('store_rating', DB::raw('COUNT(*) as c'))
                ->groupBy('store_rating')
                ->pluck('c', 'store_rating')
                ->all();
            for ($r = 1; $r <= 5; $r++) {
                $storeRatings[] = ['name' => "Ocjena $r", 'rating' => $r, 'value' => (int) ($ratingCounts[$r] ?? 0)];
            }

            $topStores = DB::table('retail_control_records')
                ->leftJoin('hrm_stores', 'retail_control_records.store_id', '=', 'hrm_stores.id')
                ->where('retail_control_records.control_date_from', '>=', $startDate)
                ->select(
                    'retail_control_records.store_id',
                    DB::raw('MAX(hrm_stores.name) as store_name'),
                    DB::raw('MAX(retail_control_records.store_code) as store_code'),
                    DB::raw('COUNT(*) as controls'),
                    DB::raw('ROUND(AVG(retail_control_records.store_rating), 1) as avg_rating')
                )
                ->groupBy('retail_control_records.store_id')
                ->orderByDesc('controls')
                ->limit(10)
                ->get()
                ->map(fn ($r) => [
                    'name' => $r->store_name ?: ('Prodavnica ' . ($r->store_code ?: $r->store_id)),
                    'controls' => (int) $r->controls,
                    'avg_rating' => $r->avg_rating !== null ? (float) $r->avg_rating : null,
                ])
                ->values()
                ->all();
        }

        if ($hasObservations) {
            $byCategory = [];
            DB::table('retail_control_observations')
                ->select(
                    'category',
                    DB::raw("SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as ok"),
                    DB::raw("SUM(CASE WHEN status = 'not_ok' THEN 1 ELSE 0 END) as not_ok")
                )
                ->groupBy('category')
                ->get()
                ->each(function ($r) use (&$byCategory) {
                    $name = trim((string) $r->category) !== '' ? $r->category : 'Ostalo';
                    $byCategory[$name]['name'] = $name;
                    $byCategory[$name]['ok'] = ($byCategory[$name]['ok'] ?? 0) + (int) $r->ok;
                    $byCategory[$name]['not_ok'] = ($byCategory[$name]['not_ok'] ?? 0) + (int) $r->not_ok;
                });
            ksort($byCategory);
            $observationsByCategory = array_values($byCategory);
        }

        if ($hasMeasures) {
            $kpis['open_measures'] = DB::table('retail_control_measures')
                ->whereIn('status', ['pending', 'in_progress'])
                ->count();
            $kpis['overdue_measures'] = DB::table('retail_control_measures')
                ->whereIn('status', ['pending', 'in_progress'])
                ->whereNotNull('deadline')
                ->where('deadline', '<', $today)
                ->count();

            $measureLabels = ['pending' => 'Na čekanju', 'in_progress' => 'U toku', 'completed' => 'Završeno', 'cancelled' => 'Otkazano'];
            $measureColors = ['pending' => '#f59e0b', 'in_progress' => '#0284c7', 'completed' => '#16a34a', 'cancelled' => '#94a3b8'];
            $measuresStatus = DB::table('retail_control_measures')
                ->select('status', DB::raw('COUNT(*) as value'))
                ->groupBy('status')
                ->get()
                ->map(fn ($r) => [
                    'key' => $r->status,
                    'name' => $measureLabels[$r->status] ?? ($r->status ?: 'Nepoznato'),
                    'value' => (int) $r->value,
                    'color' => $measureColors[$r->status] ?? '#64748b',
                ])
                ->values()
                ->all();
        }

        if ($hasEducations) {
            $edu = DB::table('retail_education_plans');
            $kpis['educations_period'] = (clone $edu)->where('education_date', '>=', $startDate)->count();
            $kpis['educations_this_month'] = (clone $edu)->whereBetween('education_date', [$monthStart, $monthEnd])->count();
            $kpis['educations_completed'] = (clone $edu)->where('status', 'completed')->where('education_date', '>=', $startDate)->count();

            $eduPlannedMap = $monthlyCount(DB::table('retail_education_plans'), 'education_date');
            $eduCompletedMap = $monthlyCount(DB::table('retail_education_plans')->where('status', 'completed'), 'education_date');
            foreach ($monthKeys as $ym => $label) {
                $educationTrend[] = [
                    'month' => $label,
                    'ym' => $ym,
                    'planned' => (int) ($eduPlannedMap[$ym] ?? 0),
                    'completed' => (int) ($eduCompletedMap[$ym] ?? 0),
                ];
            }

            $eduTypeLabels = ['internal' => 'Interna', 'external' => 'Eksterna', 'online' => 'Online', 'workshop' => 'Radionica'];
            $educationByType = DB::table('retail_education_plans')
                ->select('education_type', DB::raw('COUNT(*) as value'))
                ->groupBy('education_type')
                ->get()
                ->map(fn ($r) => [
                    'key' => $r->education_type,
                    'name' => $eduTypeLabels[$r->education_type] ?? $r->education_type,
                    'value' => (int) $r->value,
                ])
                ->values()
                ->all();
        }

        return response()->json([
            'kpis' => $kpis,
            'activity_status' => $activityStatus,
            'plans_by_type' => $plansByType,
            'activity_trend' => $activityTrend,
            'upcoming_activities' => $upcomingActivities,
            'manager_performance' => $managerPerformance,
            'controls_trend' => $controlsTrend,
            'observations_by_category' => $observationsByCategory,
            'inventory_status' => $inventoryStatus,
            'store_ratings' => $storeRatings,
            'top_stores' => $topStores,
            'measures_status' => $measuresStatus,
            'education_trend' => $educationTrend,
            'education_by_type' => $educationByType,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get all control plans
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('retail_control_plans')
                ->select('retail_control_plans.*')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id) as items_count')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id AND retail_control_plan_items.status = "completed") as completed_items_count')
                ->orderBy('retail_control_plans.year', 'desc')
                ->orderBy('retail_control_plans.created_at', 'desc');

            if ($request->has('type') && $request->type !== 'all') {
                $query->where('retail_control_plans.type', $request->type);
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('retail_control_plans.status', $request->status);
            }

            if ($request->has('year')) {
                $query->where('retail_control_plans.year', $request->year);
            }

            if ($request->has('regional_manager_id')) {
                $query->where('retail_control_plans.regional_manager_id', $request->regional_manager_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('retail_control_plans.title', 'like', "%{$search}%")
                      ->orWhere('retail_control_plans.description', 'like', "%{$search}%");
                });
            }

            $plans = $query->paginate($request->get('per_page', 20));
            return response()->json($plans);
        } catch (\Exception $e) {
            Log::error('Error fetching control plans', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get single control plan with items
     */
    public function show($id)
    {
        try {
            $plan = DB::table('retail_control_plans')
                ->select('retail_control_plans.*')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
                ->where('retail_control_plans.id', $id)
                ->first();

            if (!$plan) {
                return response()->json(['message' => 'Plan not found'], 404);
            }

            // Get plan items
            $items = DB::table('retail_control_plan_items')
                ->select('retail_control_plan_items.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plan_items.assigned_to) as assigned_to_name')
                ->where('retail_control_plan_items.plan_id', $id)
                ->orderBy('retail_control_plan_items.planned_date', 'asc')
                ->get();

            $plan->items = $items;

            return response()->json($plan);
        } catch (\Exception $e) {
            Log::error('Error fetching control plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create control plan (optionally with activities in one request)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:inventory_required,inventory_extraordinary,store_visit',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'year' => 'nullable|integer|min:2020|max:2100',
            'created_date' => 'nullable|date',
            'regional_manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:draft,active,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.store_id' => 'required_with:items|exists:hrm_stores,id',
            'items.*.planned_date' => 'required_with:items|date',
            'items.*.assigned_to' => 'nullable|exists:users,id',
            'items.*.priority' => 'nullable|integer|min:0|max:2',
            'items.*.notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $validator->validated();
            $items = $data['items'] ?? [];
            unset($data['items']);

            // Datum kreiranja plana → start_date; year izveden iz datuma
            $createdDate = $data['created_date'] ?? $data['start_date'] ?? now()->toDateString();
            unset($data['created_date']);
            $data['start_date'] = $createdDate;
            $data['year'] = $data['year'] ?? (int) date('Y', strtotime($createdDate));
            $data['status'] = $data['status'] ?? 'active';
            $data['deadline'] = null;
            $data['total_stores'] = count($items);
            $data['completed_stores'] = 0;

            $id = DB::transaction(function () use ($data, $items) {
                $planId = DB::table('retail_control_plans')->insertGetId($data);

                foreach ($items as $item) {
                    DB::table('retail_control_plan_items')->insert([
                        'plan_id' => $planId,
                        'store_id' => $item['store_id'],
                        'planned_date' => $item['planned_date'],
                        'assigned_to' => $item['assigned_to'] ?? null,
                        'priority' => $item['priority'] ?? 0,
                        'notes' => $item['notes'] ?? null,
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return $planId;
            });

            $plan = DB::table('retail_control_plans')
                ->select('retail_control_plans.*')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id) as items_count')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id AND retail_control_plan_items.status = "completed") as completed_items_count')
                ->where('retail_control_plans.id', $id)
                ->first();

            return response()->json($plan, 201);
        } catch (\Exception $e) {
            Log::error('Error creating control plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update control plan
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:inventory_required,inventory_extraordinary,store_visit',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'year' => 'sometimes|integer|min:2020|max:2100',
            'created_date' => 'nullable|date',
            'regional_manager_id' => 'nullable|exists:users,id',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $plan = DB::table('retail_control_plans')->where('id', $id)->first();
            if (!$plan) {
                return response()->json(['message' => 'Plan not found'], 404);
            }

            $data = $validator->validated();

            if (isset($data['created_date'])) {
                $data['start_date'] = $data['created_date'];
                $data['year'] = (int) date('Y', strtotime($data['created_date']));
                unset($data['created_date']);
            } elseif (!empty($data['start_date'])) {
                $data['year'] = $data['year'] ?? (int) date('Y', strtotime($data['start_date']));
            }

            // When marking plan completed, ensure end_date is set
            if (($data['status'] ?? null) === 'completed' && empty($data['end_date'])) {
                $data['end_date'] = now()->toDateString();
            }

            DB::table('retail_control_plans')->where('id', $id)->update($data);

            // Update total_stores and completed_stores counts
            $totalStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $id)
                ->count();
            
            $completedStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $id)
                ->where('status', 'completed')
                ->count();

            DB::table('retail_control_plans')
                ->where('id', $id)
                ->update([
                    'total_stores' => $totalStores,
                    'completed_stores' => $completedStores
                ]);

            $updatedPlan = DB::table('retail_control_plans')
                ->select('retail_control_plans.*')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id) as items_count')
                ->selectRaw('(SELECT COUNT(*) FROM retail_control_plan_items WHERE retail_control_plan_items.plan_id = retail_control_plans.id AND retail_control_plan_items.status = "completed") as completed_items_count')
                ->where('retail_control_plans.id', $id)
                ->first();

            return response()->json($updatedPlan);
        } catch (\Exception $e) {
            Log::error('Error updating control plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete control plan
     */
    public function destroy($id)
    {
        try {
            $plan = DB::table('retail_control_plans')->where('id', $id)->first();
            if (!$plan) {
                return response()->json(['message' => 'Plan not found'], 404);
            }

            // Delete plan items first (cascade should handle this, but being explicit)
            DB::table('retail_control_plan_items')->where('plan_id', $id)->delete();
            DB::table('retail_control_plans')->where('id', $id)->delete();

            return response()->json(['message' => 'Plan deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting control plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get plan items
     */
    public function getItems(Request $request, $planId)
    {
        try {
            $query = DB::table('retail_control_plan_items')
                ->select('retail_control_plan_items.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plan_items.assigned_to) as assigned_to_name')
                ->where('retail_control_plan_items.plan_id', $planId);

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('retail_control_plan_items.status', $request->status);
            }

            if ($request->has('store_id')) {
                $query->where('retail_control_plan_items.store_id', $request->store_id);
            }

            $items = $query->orderBy('retail_control_plan_items.planned_date', 'asc')->get();
            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('Error fetching plan items', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create plan item
     */
    public function createItem(Request $request, $planId)
    {
        $validator = Validator::make($request->all(), [
            'store_id' => 'required|exists:hrm_stores,id',
            'planned_date' => 'required|date',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'nullable|integer|min:0|max:2',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $plan = DB::table('retail_control_plans')->where('id', $planId)->first();
            if (!$plan) {
                return response()->json(['message' => 'Plan not found'], 404);
            }

            $data = $validator->validated();
            $data['plan_id'] = $planId;
            $data['status'] = 'pending';
            $data['priority'] = $data['priority'] ?? 0;

            $itemId = DB::table('retail_control_plan_items')->insertGetId($data);

            // Update plan counts
            $totalStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $planId)
                ->count();
            
            DB::table('retail_control_plans')
                ->where('id', $planId)
                ->update(['total_stores' => $totalStores]);

            $item = DB::table('retail_control_plan_items')
                ->select('retail_control_plan_items.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plan_items.assigned_to) as assigned_to_name')
                ->where('retail_control_plan_items.id', $itemId)
                ->first();

            return response()->json($item, 201);
        } catch (\Exception $e) {
            Log::error('Error creating plan item', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update plan item
     */
    public function updateItem(Request $request, $planId, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'store_id' => 'sometimes|exists:hrm_stores,id',
            'planned_date' => 'sometimes|date',
            'completed_date' => 'nullable|date',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled,overdue',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'nullable|integer|min:0|max:2',
            'notes' => 'nullable|string',
            'findings' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $item = DB::table('retail_control_plan_items')
                ->where('id', $itemId)
                ->where('plan_id', $planId)
                ->first();

            if (!$item) {
                return response()->json(['message' => 'Item not found'], 404);
            }

            $data = $validator->validated();
            
            // Auto-set completed_date if status is completed
            if (isset($data['status']) && $data['status'] === 'completed' && !isset($data['completed_date'])) {
                $data['completed_date'] = now()->toDateString();
            }

            DB::table('retail_control_plan_items')
                ->where('id', $itemId)
                ->update($data);

            // Update plan counts
            $completedStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $planId)
                ->where('status', 'completed')
                ->count();
            
            DB::table('retail_control_plans')
                ->where('id', $planId)
                ->update(['completed_stores' => $completedStores]);

            $updatedItem = DB::table('retail_control_plan_items')
                ->select('retail_control_plan_items.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_plan_items.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plan_items.assigned_to) as assigned_to_name')
                ->where('retail_control_plan_items.id', $itemId)
                ->first();

            return response()->json($updatedItem);
        } catch (\Exception $e) {
            Log::error('Error updating plan item', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete plan item
     */
    public function deleteItem($planId, $itemId)
    {
        try {
            $item = DB::table('retail_control_plan_items')
                ->where('id', $itemId)
                ->where('plan_id', $planId)
                ->first();

            if (!$item) {
                return response()->json(['message' => 'Item not found'], 404);
            }

            DB::table('retail_control_plan_items')->where('id', $itemId)->delete();

            // Update plan counts
            $totalStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $planId)
                ->count();
            
            $completedStores = DB::table('retail_control_plan_items')
                ->where('plan_id', $planId)
                ->where('status', 'completed')
                ->count();
            
            DB::table('retail_control_plans')
                ->where('id', $planId)
                ->update([
                    'total_stores' => $totalStores,
                    'completed_stores' => $completedStores
                ]);

            return response()->json(['message' => 'Item deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting plan item', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
