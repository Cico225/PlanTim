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
     * Create control plan
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:inventory_required,inventory_extraordinary,store_visit',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'year' => 'required|integer|min:2020|max:2100',
            'regional_manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:draft,active,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
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
            $data = $validator->validated();
            $data['status'] = $data['status'] ?? 'draft';
            $data['total_stores'] = 0;
            $data['completed_stores'] = 0;

            $id = DB::table('retail_control_plans')->insertGetId($data);

            $plan = DB::table('retail_control_plans')
                ->select('retail_control_plans.*')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_control_plans.regional_manager_id) as regional_manager_name')
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
            'regional_manager_id' => 'nullable|exists:users,id',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
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
