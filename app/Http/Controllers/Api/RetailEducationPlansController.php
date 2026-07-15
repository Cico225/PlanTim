<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RetailEducationPlansController extends Controller
{
    /**
     * Get all education plans
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('retail_education_plans')
                ->select('retail_education_plans.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.user_id) as employee_name')
                ->selectRaw('(SELECT email FROM users WHERE users.id = hrm_employees.user_id) as employee_email')
                ->join('hrm_employees', 'retail_education_plans.employee_id', '=', 'hrm_employees.id')
                ->orderBy('retail_education_plans.education_date', 'desc');

            if ($request->has('store_id')) {
                $query->where('retail_education_plans.store_id', $request->store_id);
            }

            if ($request->has('employee_id')) {
                $query->where('retail_education_plans.employee_id', $request->employee_id);
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('retail_education_plans.status', $request->status);
            }

            if ($request->has('education_type') && $request->education_type !== 'all') {
                $query->where('retail_education_plans.education_type', $request->education_type);
            }

            if ($request->has('date_from')) {
                $query->where('retail_education_plans.education_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('retail_education_plans.education_date', '<=', $request->date_to);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('retail_education_plans.title', 'like', "%{$search}%")
                      ->orWhere('retail_education_plans.topic', 'like', "%{$search}%")
                      ->orWhere('retail_education_plans.description', 'like', "%{$search}%");
                });
            }

            $plans = $query->paginate($request->get('per_page', 20));
            return response()->json($plans);
        } catch (\Exception $e) {
            Log::error('Error fetching education plans', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get single education plan
     */
    public function show($id)
    {
        try {
            $plan = DB::table('retail_education_plans')
                ->select('retail_education_plans.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.user_id) as employee_name')
                ->selectRaw('(SELECT email FROM users WHERE users.id = hrm_employees.user_id) as employee_email')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_education_plans.instructor_id) as instructor_name')
                ->join('hrm_employees', 'retail_education_plans.employee_id', '=', 'hrm_employees.id')
                ->where('retail_education_plans.id', $id)
                ->first();

            if (!$plan) {
                return response()->json(['message' => 'Education plan not found'], 404);
            }

            return response()->json($plan);
        } catch (\Exception $e) {
            Log::error('Error fetching education plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create education plan
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'store_id' => 'required|exists:hrm_stores,id',
            'employee_id' => 'required|exists:hrm_employees,id',
            'education_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'education_type' => 'required|in:internal,external,online,workshop',
            'topic' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'instructor_id' => 'nullable|exists:users,id',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:planned,in_progress,completed,cancelled',
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
            $data['status'] = $data['status'] ?? 'planned';

            $id = DB::table('retail_education_plans')->insertGetId($data);

            $plan = DB::table('retail_education_plans')
                ->select('retail_education_plans.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.user_id) as employee_name')
                ->selectRaw('(SELECT email FROM users WHERE users.id = hrm_employees.user_id) as employee_email')
                ->join('hrm_employees', 'retail_education_plans.employee_id', '=', 'hrm_employees.id')
                ->where('retail_education_plans.id', $id)
                ->first();

            return response()->json($plan, 201);
        } catch (\Exception $e) {
            Log::error('Error creating education plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update education plan
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'store_id' => 'sometimes|exists:hrm_stores,id',
            'employee_id' => 'sometimes|exists:hrm_employees,id',
            'education_date' => 'sometimes|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'education_type' => 'sometimes|in:internal,external,online,workshop',
            'topic' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'instructor_id' => 'nullable|exists:users,id',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|in:planned,in_progress,completed,cancelled',
            'completed_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'feedback' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $plan = DB::table('retail_education_plans')->where('id', $id)->first();
            if (!$plan) {
                return response()->json(['message' => 'Education plan not found'], 404);
            }

            $data = $validator->validated();

            // Auto-set completed_date if status is completed
            if (isset($data['status']) && $data['status'] === 'completed' && !isset($data['completed_date'])) {
                $data['completed_date'] = now()->toDateString();
            }

            DB::table('retail_education_plans')->where('id', $id)->update($data);

            $updatedPlan = DB::table('retail_education_plans')
                ->select('retail_education_plans.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_education_plans.store_id) as store_code')
                ->selectRaw('(SELECT name FROM users WHERE users.id = hrm_employees.user_id) as employee_name')
                ->selectRaw('(SELECT email FROM users WHERE users.id = hrm_employees.user_id) as employee_email')
                ->selectRaw('(SELECT name FROM users WHERE users.id = retail_education_plans.instructor_id) as instructor_name')
                ->join('hrm_employees', 'retail_education_plans.employee_id', '=', 'hrm_employees.id')
                ->where('retail_education_plans.id', $id)
                ->first();

            return response()->json($updatedPlan);
        } catch (\Exception $e) {
            Log::error('Error updating education plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete education plan
     */
    public function destroy($id)
    {
        try {
            $plan = DB::table('retail_education_plans')->where('id', $id)->first();
            if (!$plan) {
                return response()->json(['message' => 'Education plan not found'], 404);
            }

            DB::table('retail_education_plans')->where('id', $id)->delete();

            return response()->json(['message' => 'Education plan deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting education plan', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get employees by store
     */
    public function getEmployeesByStore(Request $request, $storeId)
    {
        try {
            // Get employees that have store field matching the store name or store_id
            $store = DB::table('hrm_stores')->where('id', $storeId)->first();
            if (!$store) {
                return response()->json(['message' => 'Store not found'], 404);
            }

            // Find employees by store name (since employees have 'store' as string field)
            $employees = DB::table('hrm_employees')
                ->select('hrm_employees.*', 'users.name', 'users.email')
                ->join('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('hrm_employees.store', $store->name)
                ->where('hrm_employees.status', 'active')
                ->orderBy('users.name', 'asc')
                ->get();

            return response()->json($employees);
        } catch (\Exception $e) {
            Log::error('Error fetching employees by store', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
