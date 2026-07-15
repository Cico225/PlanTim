<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Imports\SalesResultsImport;
use App\Imports\SalesPlansImport;
use App\Models\Planika\Region;
use App\Models\Planika\Store;
use App\Models\Planika\ActivityPlan;
use App\Models\Planika\PlanAssignment;
use App\Models\Planika\ControlForm;
use App\Models\Planika\StoreControl;
use App\Models\Planika\ControlResponse;
use App\Models\Planika\EvaluationCriteria;
use App\Models\Planika\EmployeeEvaluation;
use App\Models\Planika\EvaluationResponse;
use App\Models\Planika\AuditLog;
use App\Models\Planika\VisitSchedule;
use App\Models\Planika\StoreVisit;
use App\Models\Planika\VisitReminder;
use App\Models\Planika\VisitEscalation;
use App\Models\Planika\StoreCategoryHistory;

class PlanikaMaloprodajaController extends Controller
{
    /**
     * Log audit action
     */
    private function logAudit($action, $entityType, $entityId, $userId, $oldValues = null, $newValues = null, $description = null)
    {
        AuditLog::create([
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'user_id' => $userId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'description' => $description,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Check if Planika Maloprodaja tables exist (migrations may not have been run)
     */
    private function planikaTablesExist(): bool
    {
        return Schema::hasTable('planika_maloprodaja_regions')
            && Schema::hasTable('planika_maloprodaja_stores')
            && Schema::hasTable('planika_maloprodaja_activity_plans');
    }

    /**
     * Check if user is admin
     */
    private function isAdmin($user)
    {
        if (method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole(['admin', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }
        
        if (isset($user->role)) {
            return in_array(strtolower($user->role), ['admin', 'super-admin']);
        }
        
        return false;
    }

    /**
     * Get user's store ID if they are a manager
     */
    private function getUserStoreId($user)
    {
        // Get employee record for this user
        $employee = DB::table('hrm_employees')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
        
        if (!$employee) {
            return null;
        }

        // Check if employee is a manager (has "menadžer", "manager", "voditelj" in position)
        $positionLower = mb_strtolower($employee->position ?? '', 'UTF-8');
        $isManager = strpos($positionLower, 'menadžer') !== false || 
                     strpos($positionLower, 'manager') !== false || 
                     strpos($positionLower, 'voditelj') !== false ||
                     strpos($positionLower, 'šef') !== false;

        if (!$isManager) {
            return null;
        }

        // Get store ID from employee's store field
        if ($employee->store) {
            $store = DB::table('hrm_stores')
                ->where(function($query) use ($employee) {
                    $query->where('name', $employee->store)
                          ->orWhere('code', $employee->store)
                          ->orWhere('name', 'like', '%' . $employee->store . '%');
                })
                ->first();
            
            return $store ? $store->id : null;
        }

        return null;
    }

    // ==================== REGIONS ====================

    /**
     * Get all regions
     */
    public function getRegions(Request $request)
    {
        if (!$this->planikaTablesExist()) {
            return response()->json([]);
        }

        $query = Region::with(['regionalManager', 'stores']);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        $regions = $query->get();

        return response()->json($regions);
    }

    /**
     * Get single region
     */
    public function getRegion($id)
    {
        $region = Region::with(['regionalManager', 'stores'])->find($id);

        if (!$region) {
            return response()->json(['message' => 'Region not found'], 404);
        }

        return response()->json($region);
    }

    /**
     * Create region
     */
    public function createRegion(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:planika_maloprodaja_regions,code',
            'description' => 'nullable|string',
            'regional_manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:hrm_departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $region = Region::create($validator->validated());

        $this->logAudit('created', 'region', $region->id, $request->user()->id, null, $region->toArray(), 'Region created');

        return response()->json($region, 201);
    }

    /**
     * Update region
     */
    public function updateRegion(Request $request, $id)
    {
        $region = Region::find($id);

        if (!$region) {
            return response()->json(['message' => 'Region not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:planika_maloprodaja_regions,code,' . $id,
            'description' => 'nullable|string',
            'regional_manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $region->toArray();
        $region->update($validator->validated());
        $newValues = $region->fresh()->toArray();

        $this->logAudit('updated', 'region', $region->id, $request->user()->id, $oldValues, $newValues, 'Region updated');

        return response()->json($region);
    }

    /**
     * Delete region
     */
    public function deleteRegion(Request $request, $id)
    {
        $region = Region::find($id);

        if (!$region) {
            return response()->json(['message' => 'Region not found'], 404);
        }

        // Check if region has stores
        if ($region->stores()->count() > 0) {
            return response()->json(['message' => 'Cannot delete region with stores'], 422);
        }

        $oldValues = $region->toArray();
        $region->delete();

        $this->logAudit('deleted', 'region', $id, $request->user()->id, $oldValues, null, 'Region deleted');

        return response()->json(['message' => 'Region deleted successfully']);
    }

    // ==================== STORES ====================

    /**
     * Get all stores
     */
    public function getStores(Request $request)
    {
        if (!$this->planikaTablesExist()) {
            return response()->json([]);
        }

        $query = Store::with(['region', 'storeManager']);

        if ($request->has('region_id')) {
            $query->where('region_id', $request->input('region_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        $stores = $query->get();

        return response()->json($stores);
    }

    /**
     * Get single store
     */
    public function getStore($id)
    {
        $store = Store::with(['region', 'storeManager'])->find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        return response()->json($store);
    }

    /**
     * Create store
     */
    public function createStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:planika_maloprodaja_stores,code',
            'region_id' => 'required|exists:planika_maloprodaja_regions,id',
            'store_manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'opening_hours' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $store = Store::create($validator->validated());

        $this->logAudit('created', 'store', $store->id, $request->user()->id, null, $store->toArray(), 'Store created');

        return response()->json($store, 201);
    }

    /**
     * Update store
     */
    public function updateStore(Request $request, $id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:planika_maloprodaja_stores,code,' . $id,
            'region_id' => 'sometimes|exists:planika_maloprodaja_regions,id',
            'store_manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:hrm_departments,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'opening_hours' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $store->toArray();
        $store->update($validator->validated());
        $newValues = $store->fresh()->toArray();

        $this->logAudit('updated', 'store', $store->id, $request->user()->id, $oldValues, $newValues, 'Store updated');

        return response()->json($store);
    }

    /**
     * Delete store
     */
    public function deleteStore(Request $request, $id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $oldValues = $store->toArray();
        $store->delete();

        $this->logAudit('deleted', 'store', $id, $request->user()->id, $oldValues, null, 'Store deleted');

        return response()->json(['message' => 'Store deleted successfully']);
    }

    // ==================== ACTIVITY PLANS ====================

    /**
     * Get all activity plans
     */
    public function getActivityPlans(Request $request)
    {
        if (!$this->planikaTablesExist()) {
            return response()->json([]);
        }

        $query = ActivityPlan::with(['creator', 'assignments.regionalManager']);

        if ($request->has('status')) {
            $status = $request->input('status');
            if (is_string($status) && in_array($status, ['draft', 'active', 'completed', 'cancelled'])) {
                $query->where('status', $status);
            }
        }

        if ($request->has('created_by')) {
            $query->where('created_by', $request->input('created_by'));
        }

        $plans = $query->orderBy('created_at', 'desc')->get();

        return response()->json($plans);
    }

    /**
     * Get single activity plan
     */
    public function getActivityPlan($id)
    {
        $plan = ActivityPlan::with(['creator', 'assignments.regionalManager', 'controls'])->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Activity plan not found'], 404);
        }

        return response()->json($plan);
    }

    /**
     * Create activity plan
     */
    public function createActivityPlan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'period_type' => 'required|in:monthly,quarterly,yearly',
            'target_regions' => 'nullable|array',
            'target_stores' => 'nullable|array',
            'goals' => 'nullable|array',
            'required_controls_per_month' => 'nullable|integer|min:0',
            'deadlines' => 'nullable|array',
            'priority' => 'nullable|in:low,normal,high,urgent',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $request->user()->id;
        $data['status'] = 'draft';

        $plan = ActivityPlan::create($data);

        $this->logAudit('created', 'activity_plan', $plan->id, $request->user()->id, null, $plan->toArray(), 'Activity plan created');

        return response()->json($plan, 201);
    }

    /**
     * Update activity plan
     */
    public function updateActivityPlan(Request $request, $id)
    {
        $plan = ActivityPlan::find($id);

        if (!$plan) {
            return response()->json(['message' => 'Activity plan not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'period_type' => 'sometimes|in:monthly,quarterly,yearly',
            'target_regions' => 'nullable|array',
            'target_stores' => 'nullable|array',
            'goals' => 'nullable|array',
            'required_controls_per_month' => 'nullable|integer|min:0',
            'deadlines' => 'nullable|array',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $plan->toArray();
        $plan->update($validator->validated());
        $newValues = $plan->fresh()->toArray();

        $this->logAudit('updated', 'activity_plan', $plan->id, $request->user()->id, $oldValues, $newValues, 'Activity plan updated');

        return response()->json($plan);
    }

    /**
     * Assign plan to regional managers
     */
    public function assignPlan(Request $request, $id)
    {
        $plan = ActivityPlan::find($id);

        if (!$plan) {
            return response()->json(['message' => 'Activity plan not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'regional_manager_ids' => 'required|array',
            'regional_manager_ids.*' => 'exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $assignments = [];
        foreach ($request->input('regional_manager_ids') as $managerId) {
            $assignment = PlanAssignment::updateOrCreate(
                [
                    'plan_id' => $id,
                    'regional_manager_id' => $managerId,
                ],
                [
                    'notes' => $request->input('notes'),
                    'assigned_at' => now(),
                ]
            );
            $assignments[] = $assignment;

            $this->logAudit('assigned', 'activity_plan', $id, $request->user()->id, null, ['regional_manager_id' => $managerId], "Plan assigned to manager {$managerId}");
        }

        return response()->json($assignments, 201);
    }

    /**
     * Acknowledge plan assignment
     */
    public function acknowledgePlan(Request $request, $id)
    {
        $assignment = PlanAssignment::where('plan_id', $id)
            ->where('regional_manager_id', $request->user()->id)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }

        $assignment->update(['acknowledged_at' => now()]);

        $this->logAudit('acknowledged', 'plan_assignment', $assignment->id, $request->user()->id, null, ['acknowledged_at' => $assignment->acknowledged_at], 'Plan assignment acknowledged');

        return response()->json($assignment);
    }

    // ==================== CONTROL FORMS ====================

    /**
     * Get all control forms
     */
    public function getControlForms(Request $request)
    {
        $query = ControlForm::with('creator');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $forms = $query->get();

        return response()->json($forms);
    }

    /**
     * Get single control form
     */
    public function getControlForm($id)
    {
        $form = ControlForm::with('creator')->find($id);

        if (!$form) {
            return response()->json(['message' => 'Control form not found'], 404);
        }

        return response()->json($form);
    }

    /**
     * Create control form
     */
    public function createControlForm(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sections' => 'required|array',
            'scoring_type' => 'required|in:numeric,yes_no,scale',
            'max_score' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $request->user()->id;
        $data['max_score'] = $data['max_score'] ?? 100;

        $form = ControlForm::create($data);

        $this->logAudit('created', 'control_form', $form->id, $request->user()->id, null, $form->toArray(), 'Control form created');

        return response()->json($form, 201);
    }

    /**
     * Update control form
     */
    public function updateControlForm(Request $request, $id)
    {
        $form = ControlForm::find($id);

        if (!$form) {
            return response()->json(['message' => 'Control form not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'sections' => 'sometimes|array',
            'scoring_type' => 'sometimes|in:numeric,yes_no,scale',
            'max_score' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $form->toArray();
        $form->update($validator->validated());
        $newValues = $form->fresh()->toArray();

        $this->logAudit('updated', 'control_form', $form->id, $request->user()->id, $oldValues, $newValues, 'Control form updated');

        return response()->json($form);
    }

    // ==================== STORE CONTROLS ====================

    /**
     * Get all store controls
     */
    public function getStoreControls(Request $request)
    {
        $query = StoreControl::with(['store', 'plan', 'controlForm', 'controller']);

        if ($request->has('store_id')) {
            $query->where('store_id', $request->input('store_id'));
        }

        if ($request->has('plan_id')) {
            $query->where('plan_id', $request->input('plan_id'));
        }

        if ($request->has('controlled_by')) {
            $query->where('controlled_by', $request->input('controlled_by'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $controls = $query->orderBy('control_date', 'desc')->get();

        return response()->json($controls);
    }

    /**
     * Get single store control
     */
    public function getStoreControl($id)
    {
        $control = StoreControl::with(['store', 'plan', 'controlForm', 'controller', 'responses'])->find($id);

        if (!$control) {
            return response()->json(['message' => 'Store control not found'], 404);
        }

        return response()->json($control);
    }

    /**
     * Create store control
     */
    public function createStoreControl(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'store_id' => 'required|exists:planika_maloprodaja_stores,id',
            'plan_id' => 'nullable|exists:planika_maloprodaja_activity_plans,id',
            'control_form_id' => 'required|exists:planika_maloprodaja_control_forms,id',
            'control_date' => 'required|date',
            'scores' => 'required|array',
            'responses' => 'required|array', // Array of {section_name, criterion_name, score, response, comment}
            'overall_comment' => 'nullable|string',
            'recommendations' => 'nullable|array',
            'corrective_measures' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Calculate total score
        $scores = $request->input('scores');
        $totalScore = array_sum(array_values($scores));
        
        // Get max score from form
        $form = ControlForm::find($request->input('control_form_id'));
        $maxScore = $form->max_score ?? 100;
        $percentageScore = ($totalScore / $maxScore) * 100;

        $data = $validator->validated();
        $data['controlled_by'] = $request->user()->id;
        $data['total_score'] = $totalScore;
        $data['percentage_score'] = $percentageScore;
        $data['status'] = 'draft';

        $control = StoreControl::create($data);

        // Create responses
        foreach ($request->input('responses') as $responseData) {
            ControlResponse::create([
                'control_id' => $control->id,
                'section_name' => $responseData['section_name'],
                'criterion_name' => $responseData['criterion_name'],
                'score' => $responseData['score'] ?? null,
                'response' => $responseData['response'] ?? null,
                'comment' => $responseData['comment'] ?? null,
            ]);
        }

        $this->logAudit('created', 'store_control', $control->id, $request->user()->id, null, $control->toArray(), 'Store control created');

        return response()->json(StoreControl::with(['store', 'controlForm', 'responses'])->find($control->id), 201);
    }

    /**
     * Update store control
     */
    public function updateStoreControl(Request $request, $id)
    {
        $control = StoreControl::find($id);

        if (!$control) {
            return response()->json(['message' => 'Store control not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'scores' => 'sometimes|array',
            'responses' => 'sometimes|array',
            'overall_comment' => 'nullable|string',
            'recommendations' => 'nullable|array',
            'corrective_measures' => 'nullable|array',
            'status' => 'sometimes|in:draft,completed,reviewed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $control->toArray();

        // Recalculate scores if provided
        if ($request->has('scores')) {
            $scores = $request->input('scores');
            $totalScore = array_sum(array_values($scores));
            $form = ControlForm::find($control->control_form_id);
            $maxScore = $form->max_score ?? 100;
            $percentageScore = ($totalScore / $maxScore) * 100;
            
            $control->total_score = $totalScore;
            $control->percentage_score = $percentageScore;
        }

        $control->update($validator->validated());

        // Update responses if provided
        if ($request->has('responses')) {
            ControlResponse::where('control_id', $control->id)->delete();
            foreach ($request->input('responses') as $responseData) {
                ControlResponse::create([
                    'control_id' => $control->id,
                    'section_name' => $responseData['section_name'],
                    'criterion_name' => $responseData['criterion_name'],
                    'score' => $responseData['score'] ?? null,
                    'response' => $responseData['response'] ?? null,
                    'comment' => $responseData['comment'] ?? null,
                ]);
            }
        }

        $newValues = $control->fresh()->toArray();

        $this->logAudit('updated', 'store_control', $control->id, $request->user()->id, $oldValues, $newValues, 'Store control updated');

        return response()->json(StoreControl::with(['store', 'controlForm', 'responses'])->find($control->id));
    }

    // ==================== EVALUATION CRITERIA ====================

    /**
     * Get all evaluation criteria
     */
    public function getEvaluationCriteria(Request $request)
    {
        $query = EvaluationCriteria::with('creator');

        if ($request->has('employee_type')) {
            $query->where('employee_type', $request->input('employee_type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $criteria = $query->get();

        return response()->json($criteria);
    }

    /**
     * Get single evaluation criteria
     */
    public function getEvaluationCriterion($id)
    {
        $criterion = EvaluationCriteria::with('creator')->find($id);

        if (!$criterion) {
            return response()->json(['message' => 'Evaluation criteria not found'], 404);
        }

        return response()->json($criterion);
    }

    /**
     * Create evaluation criteria
     */
    public function createEvaluationCriteria(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'employee_type' => 'required|in:salesperson,store_manager,both',
            'criteria' => 'required|array',
            'rating_type' => 'required|in:numeric,scale',
            'max_rating' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $request->user()->id;
        $data['max_rating'] = $data['max_rating'] ?? 5;

        $criterion = EvaluationCriteria::create($data);

        $this->logAudit('created', 'evaluation_criteria', $criterion->id, $request->user()->id, null, $criterion->toArray(), 'Evaluation criteria created');

        return response()->json($criterion, 201);
    }

    /**
     * Update evaluation criteria
     */
    public function updateEvaluationCriteria(Request $request, $id)
    {
        $criterion = EvaluationCriteria::find($id);

        if (!$criterion) {
            return response()->json(['message' => 'Evaluation criteria not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'employee_type' => 'sometimes|in:salesperson,store_manager,both',
            'criteria' => 'sometimes|array',
            'rating_type' => 'sometimes|in:numeric,scale',
            'max_rating' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $criterion->toArray();
        $criterion->update($validator->validated());
        $newValues = $criterion->fresh()->toArray();

        $this->logAudit('updated', 'evaluation_criteria', $criterion->id, $request->user()->id, $oldValues, $newValues, 'Evaluation criteria updated');

        return response()->json($criterion);
    }

    // ==================== EMPLOYEE EVALUATIONS ====================

    /**
     * Get all employee evaluations
     */
    public function getEmployeeEvaluations(Request $request)
    {
        $query = EmployeeEvaluation::with(['store', 'evaluator', 'criteria']);

        // Get employee info from HRM
        $evaluations = $query->get()->map(function ($evaluation) {
            $employee = DB::table('hrm_employees')
                ->join('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('hrm_employees.id', $evaluation->employee_id)
                ->select('hrm_employees.*', 'users.name', 'users.email')
                ->first();
            
            $evaluation->employee = $employee;
            return $evaluation;
        });

        if ($request->has('employee_id')) {
            $evaluations = $evaluations->where('employee_id', $request->input('employee_id'));
        }

        if ($request->has('store_id')) {
            $evaluations = $evaluations->where('store_id', $request->input('store_id'));
        }

        if ($request->has('evaluator_id')) {
            $evaluations = $evaluations->where('evaluator_id', $request->input('evaluator_id'));
        }

        return response()->json($evaluations->values());
    }

    /**
     * Get single employee evaluation
     */
    public function getEmployeeEvaluation($id)
    {
        $evaluation = EmployeeEvaluation::with(['store', 'evaluator', 'criteria', 'responses'])->find($id);

        if (!$evaluation) {
            return response()->json(['message' => 'Employee evaluation not found'], 404);
        }

        // Get employee info from HRM
        $employee = DB::table('hrm_employees')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where('hrm_employees.id', $evaluation->employee_id)
            ->select('hrm_employees.*', 'users.name', 'users.email')
            ->first();

        $evaluation->employee = $employee;

        // Get signatures if table exists
        if (Schema::hasTable('planika_maloprodaja_evaluation_signatures')) {
            $signatures = DB::table('planika_maloprodaja_evaluation_signatures')
                ->select('planika_maloprodaja_evaluation_signatures.*', 'users.name as user_name')
                ->leftJoin('users', 'planika_maloprodaja_evaluation_signatures.user_id', '=', 'users.id')
                ->where('planika_maloprodaja_evaluation_signatures.evaluation_id', $id)
                ->get();

            $evaluation->signatures = $signatures;
        } else {
            $evaluation->signatures = [];
        }

        return response()->json($evaluation);
    }

    /**
     * Create employee evaluation
     */
    public function createEmployeeEvaluation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'store_id' => 'required|exists:planika_maloprodaja_stores,id',
            'evaluation_criteria_id' => 'required|exists:planika_maloprodaja_evaluation_criteria,id',
            'evaluation_date' => 'required|date',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'scores' => 'required|array',
            'responses' => 'required|array', // Array of {criterion_name, score, comment}
            'overall_comment' => 'nullable|string',
            'recommendations' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Calculate average score
        $scores = $request->input('scores');
        $averageScore = count($scores) > 0 ? array_sum(array_values($scores)) / count($scores) : 0;

        // Determine rating
        $rating = $this->determineRating($averageScore);

        $data = $validator->validated();
        $data['evaluator_id'] = $request->user()->id;
        $data['average_score'] = $averageScore;
        $data['rating'] = $rating;
        $data['status'] = 'draft';

        $evaluation = EmployeeEvaluation::create($data);

        // Create responses
        foreach ($request->input('responses') as $responseData) {
            EvaluationResponse::create([
                'evaluation_id' => $evaluation->id,
                'criterion_name' => $responseData['criterion_name'],
                'score' => $responseData['score'],
                'comment' => $responseData['comment'] ?? null,
            ]);
        }

        $this->logAudit('created', 'employee_evaluation', $evaluation->id, $request->user()->id, null, $evaluation->toArray(), 'Employee evaluation created');

        return response()->json(EmployeeEvaluation::with(['store', 'evaluator', 'criteria', 'responses'])->find($evaluation->id), 201);
    }

    /**
     * Update employee evaluation
     */
    public function updateEmployeeEvaluation(Request $request, $id)
    {
        $evaluation = EmployeeEvaluation::find($id);

        if (!$evaluation) {
            return response()->json(['message' => 'Employee evaluation not found'], 404);
        }

        // Check if evaluation is locked (completed) - allow only signature_status update
        $isLocked = $evaluation->signature_status === 'completed';
        $isOnlyLocking = $request->has('signature_status') && 
                        $request->input('signature_status') === 'completed' && 
                        ($evaluation->signature_status === 'evaluator_signed' || $evaluation->signature_status === 'completed');
        
        // If locked, only allow signature_status update to completed (if not already completed)
        if ($isLocked && !$isOnlyLocking) {
            // Check if only signature_status is being updated to completed
            $onlySignatureStatusUpdate = $request->has('signature_status') && 
                                        $request->input('signature_status') === 'completed' &&
                                        count($request->all()) === 1;
            
            if (!$onlySignatureStatusUpdate) {
                return response()->json(['message' => 'Evaluation is locked and cannot be modified'], 422);
            }
        }
        
        // If evaluator_signed, only allow updating to completed
        if ($evaluation->signature_status === 'evaluator_signed' && !$isOnlyLocking) {
            // Check if trying to update other fields
            $hasOtherFields = $request->has('scores') || 
                             $request->has('responses') || 
                             ($request->has('overall_comment') && $request->input('overall_comment') !== $evaluation->overall_comment) ||
                             ($request->has('recommendations') && $request->input('recommendations') !== $evaluation->recommendations);
            
            if ($hasOtherFields) {
                return response()->json(['message' => 'Evaluation is signed by evaluator and cannot be modified'], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'scores' => 'sometimes|array',
            'responses' => 'sometimes|array',
            'overall_comment' => 'nullable|string',
            'recommendations' => 'nullable|array',
            'status' => 'sometimes|in:draft,completed,acknowledged',
            'signature_status' => 'sometimes|in:draft,evaluator_signed,employee_signed,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = $evaluation->toArray();

        // Only allow updating scores/responses if not locked
        if (!$isLocked) {
            // Recalculate average score if scores provided
            if ($request->has('scores')) {
                $scores = $request->input('scores');
                $averageScore = count($scores) > 0 ? array_sum(array_values($scores)) / count($scores) : 0;
                $rating = $this->determineRating($averageScore);
                
                $evaluation->average_score = $averageScore;
                $evaluation->rating = $rating;
            }
        }

        if ($request->input('status') === 'acknowledged') {
            $evaluation->acknowledged_at = now();
        }

        // Update only allowed fields
        $updateData = $validator->validated();
        if ($isLocked) {
            // If locked, only allow signature_status and status updates
            $updateData = array_intersect_key($updateData, array_flip(['signature_status', 'status']));
        }
        
        $evaluation->update($updateData);

        // Update responses if provided
        if ($request->has('responses')) {
            EvaluationResponse::where('evaluation_id', $evaluation->id)->delete();
            foreach ($request->input('responses') as $responseData) {
                EvaluationResponse::create([
                    'evaluation_id' => $evaluation->id,
                    'criterion_name' => $responseData['criterion_name'],
                    'score' => $responseData['score'],
                    'comment' => $responseData['comment'] ?? null,
                ]);
            }
        }

        $newValues = $evaluation->fresh()->toArray();

        $this->logAudit('updated', 'employee_evaluation', $evaluation->id, $request->user()->id, $oldValues, $newValues, 'Employee evaluation updated');

        return response()->json(EmployeeEvaluation::with(['store', 'evaluator', 'criteria', 'responses'])->find($evaluation->id));
    }

    /**
     * Acknowledge evaluation (by employee)
     */
    public function acknowledgeEvaluation(Request $request, $id)
    {
        $evaluation = EmployeeEvaluation::find($id);

        if (!$evaluation) {
            return response()->json(['message' => 'Employee evaluation not found'], 404);
        }

        // Verify that the current user is the employee being evaluated
        $employee = DB::table('hrm_employees')
            ->where('id', $evaluation->employee_id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $evaluation->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);

        $this->logAudit('acknowledged', 'employee_evaluation', $evaluation->id, $request->user()->id, null, ['acknowledged_at' => $evaluation->acknowledged_at], 'Employee evaluation acknowledged');

        return response()->json($evaluation);
    }

    /**
     * Sign evaluation
     */
    public function signEvaluation(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'signature_type' => 'required|in:evaluator,employee',
                'signature_data' => 'nullable|string', // Base64 encoded signature image
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $evaluation = EmployeeEvaluation::find($id);
            if (!$evaluation) {
                return response()->json(['error' => 'Evaluation not found'], 404);
            }

            // Check if evaluation is locked (already signed by evaluator)
            if ($evaluation->signature_status === 'evaluator_signed' || $evaluation->signature_status === 'completed') {
                // Only allow employee to sign if evaluator already signed
                if ($request->signature_type === 'evaluator') {
                    return response()->json(['error' => 'Evaluation is already signed by evaluator and cannot be modified'], 422);
                }
            }

            // Verify user permissions
            if ($request->signature_type === 'evaluator') {
                // Only evaluator can sign as evaluator
                if ($evaluation->evaluator_id !== $user->id) {
                    return response()->json(['error' => 'Only the evaluator can sign as evaluator'], 403);
                }
            } elseif ($request->signature_type === 'employee') {
                // Only the evaluated employee can sign as employee
                $employee = DB::table('hrm_employees')
                    ->where('id', $evaluation->employee_id)
                    ->where('user_id', $user->id)
                    ->first();
                
                if (!$employee) {
                    return response()->json(['error' => 'Only the evaluated employee can sign as employee'], 403);
                }
            }

            // Check if signatures table exists
            if (!Schema::hasTable('planika_maloprodaja_evaluation_signatures')) {
                // If table doesn't exist, just update evaluation status without storing signature
                $newStatus = 'draft';
                if ($request->signature_type === 'evaluator') {
                    $newStatus = 'evaluator_signed';
                } elseif ($request->signature_type === 'employee') {
                    $newStatus = 'employee_signed';
                }

                $evaluation->update([
                    'signature_status' => $newStatus,
                ]);

                // Lock evaluation if evaluator signed (prevent further modifications)
                if ($request->signature_type === 'evaluator') {
                    $evaluation->update(['status' => 'completed']);
                }

                // Return a mock signature object
                $signature = (object)[
                    'id' => null,
                    'evaluation_id' => $id,
                    'user_id' => $user->id,
                    'signature_type' => $request->signature_type,
                    'signature_data' => $request->signature_data,
                    'signed_at' => now(),
                    'user_name' => $user->name,
                ];

                $this->logAudit('signed', 'employee_evaluation', $id, $user->id, null, ['signature_type' => $request->signature_type], 'Evaluation signed (signatures table not available)');

                return response()->json($signature, 201);
            }

            // Check if already signed
            $existing = DB::table('planika_maloprodaja_evaluation_signatures')
                ->where('evaluation_id', $id)
                ->where('user_id', $user->id)
                ->where('signature_type', $request->signature_type)
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Already signed'], 422);
            }

            // Create signature hash
            $signatureHash = hash('sha256', $id . $user->id . $request->signature_type . now() . ($request->signature_data ?? ''));

            $signatureId = DB::table('planika_maloprodaja_evaluation_signatures')->insertGetId([
                'evaluation_id' => $id,
                'user_id' => $user->id,
                'signature_type' => $request->signature_type,
                'signature_data' => $request->signature_data,
                'signature_hash' => $signatureHash,
                'signed_at' => now(),
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update evaluation signature status
            $newStatus = 'draft';
            if ($request->signature_type === 'evaluator') {
                $newStatus = 'evaluator_signed';
            } elseif ($request->signature_type === 'employee') {
                // Check if evaluator already signed
                $hasEvaluatorSignature = DB::table('planika_maloprodaja_evaluation_signatures')
                    ->where('evaluation_id', $id)
                    ->where('signature_type', 'evaluator')
                    ->exists();
                
                if ($hasEvaluatorSignature) {
                    $newStatus = 'completed';
                } else {
                    $newStatus = 'employee_signed';
                }
            }

            $evaluation->update([
                'signature_status' => $newStatus,
            ]);

            // Lock evaluation if evaluator signed (prevent further modifications)
            if ($request->signature_type === 'evaluator') {
                $evaluation->update(['status' => 'completed']);
            }

            $signature = DB::table('planika_maloprodaja_evaluation_signatures')
                ->select('planika_maloprodaja_evaluation_signatures.*', 'users.name as user_name')
                ->leftJoin('users', 'planika_maloprodaja_evaluation_signatures.user_id', '=', 'users.id')
                ->where('planika_maloprodaja_evaluation_signatures.id', $signatureId)
                ->first();

            $this->logAudit('signed', 'employee_evaluation', $id, $user->id, null, ['signature_type' => $request->signature_type], 'Evaluation signed');

            return response()->json($signature, 201);
        } catch (\Exception $e) {
            Log::error('Error signing evaluation', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to sign evaluation'], 500);
        }
    }

    /**
     * Delete employee evaluation (Admin only)
     */
    public function deleteEmployeeEvaluation(Request $request, $id)
    {
        try {
            $evaluation = EmployeeEvaluation::find($id);

            if (!$evaluation) {
                return response()->json(['message' => 'Employee evaluation not found'], 404);
            }

            // Check if user is admin
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check admin role
            $isAdmin = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdmin = $user->hasAnyRole(['admin', 'super-admin']);
                } catch (\Exception $e) {
                    \Log::warning('Failed to check user role in deleteEmployeeEvaluation', ['error' => $e->getMessage()]);
                }
            }

            // Also check role string/array
            if (!$isAdmin) {
                $userRoleString = strtolower($user->role ?? '');
                $userRolesArray = $user->roles ?? [];
                $isAdmin = $userRoleString === 'admin' || 
                          $userRoleString === 'super-admin' ||
                          in_array('admin', array_map('strtolower', $userRolesArray)) ||
                          in_array('super-admin', array_map('strtolower', $userRolesArray));
            }

            if (!$isAdmin) {
                return response()->json(['message' => 'Only administrators can delete evaluations'], 403);
            }

            $oldValues = $evaluation->toArray();

            // Delete related signatures if table exists
            if (Schema::hasTable('planika_maloprodaja_evaluation_signatures')) {
                DB::table('planika_maloprodaja_evaluation_signatures')
                    ->where('evaluation_id', $id)
                    ->delete();
            }

            // Delete related responses
            DB::table('planika_maloprodaja_evaluation_responses')
                ->where('evaluation_id', $id)
                ->delete();

            // Delete evaluation
            $evaluation->delete();

            $this->logAudit('deleted', 'employee_evaluation', $id, $user->id, $oldValues, null, 'Employee evaluation deleted by admin');

            return response()->json(['message' => 'Employee evaluation deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting evaluation', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to delete evaluation'], 500);
        }
    }

    /**
     * Get evaluation PDF
     */
    public function getEvaluationPdf($id)
    {
        try {
            // Try to find evaluation using Eloquent model first
            $evaluation = EmployeeEvaluation::with(['store', 'evaluator', 'criteria', 'responses'])->find($id);
            
            // Ensure signature_status is loaded for Eloquent model
            if ($evaluation) {
                // Reload signature_status if not already loaded
                if (!isset($evaluation->signature_status)) {
                    $evaluationData = DB::table('planika_maloprodaja_employee_evaluations')
                        ->where('id', $id)
                        ->select('signature_status')
                        ->first();
                    if ($evaluationData) {
                        $evaluation->signature_status = $evaluationData->signature_status;
                    }
                }
            }
            
            // If not found, try to find it using DB facade (for manager evaluations)
            if (!$evaluation) {
                $evaluationData = DB::table('planika_maloprodaja_employee_evaluations')
                    ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'planika_maloprodaja_stores.id')
                    ->leftJoin('users as evaluator_user', 'planika_maloprodaja_employee_evaluations.evaluator_id', '=', 'evaluator_user.id')
                    ->where('planika_maloprodaja_employee_evaluations.id', $id)
                    ->select(
                        'planika_maloprodaja_employee_evaluations.*',
                        'planika_maloprodaja_stores.name as store_name',
                        'evaluator_user.name as evaluator_name'
                    )
                    ->first();
                
                if (!$evaluationData) {
                    return response()->json(['error' => 'Evaluation not found'], 404);
                }
                
                // Convert to object with proper structure
                $evaluation = (object) [
                    'id' => $evaluationData->id,
                    'employee_id' => $evaluationData->employee_id,
                    'store_id' => $evaluationData->store_id,
                    'evaluator_id' => $evaluationData->evaluator_id,
                    'evaluation_date' => $evaluationData->evaluation_date,
                    'period_start' => $evaluationData->period_start,
                    'period_end' => $evaluationData->period_end,
                    'scores' => json_decode($evaluationData->scores ?? '{}', true),
                    'average_score' => $evaluationData->average_score,
                    'rating' => $evaluationData->rating,
                    'overall_comment' => $evaluationData->overall_comment,
                    'recommendations' => json_decode($evaluationData->recommendations ?? '[]', true),
                    'status' => $evaluationData->status,
                    'signature_status' => $evaluationData->signature_status ?? null,
                    'category' => $evaluationData->category ?? null,
                    'type' => $evaluationData->type ?? null,
                    'evaluator_name' => $evaluationData->evaluator_name ?? null,
                    'comments' => json_decode($evaluationData->comments ?? '{}', true),
                    'store' => $evaluationData->store_name ? (object) ['name' => $evaluationData->store_name] : null,
                    'evaluator' => $evaluationData->evaluator_name ? (object) ['name' => $evaluationData->evaluator_name] : null,
                    'criteria' => null,
                    'responses' => collect([]),
                ];
            }

            // Get employee info
            $employee = DB::table('hrm_employees')
                ->join('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('hrm_employees.id', $evaluation->employee_id)
                ->select('hrm_employees.*', 'users.name', 'users.email')
                ->first();

            // Get signatures if table exists
            $signatures = collect([]);
            
            // Debug: Check if table exists
            $tableExists = Schema::hasTable('planika_maloprodaja_evaluation_signatures');
            Log::info('PDF Generation - Checking signatures table', [
                'evaluation_id' => $id,
                'table_exists' => $tableExists,
            ]);
            
            if ($tableExists) {
                // Debug: Check raw query first
                $rawCount = DB::table('planika_maloprodaja_evaluation_signatures')
                    ->where('evaluation_id', $id)
                    ->count();
                
                Log::info('PDF Generation - Raw signatures count', [
                    'evaluation_id' => $id,
                    'raw_count' => $rawCount,
                ]);
                
                // Get all signatures for this evaluation
                $signatures = DB::table('planika_maloprodaja_evaluation_signatures')
                    ->leftJoin('users', 'planika_maloprodaja_evaluation_signatures.user_id', '=', 'users.id')
                    ->where('planika_maloprodaja_evaluation_signatures.evaluation_id', $id)
                    ->select(
                        'planika_maloprodaja_evaluation_signatures.id',
                        'planika_maloprodaja_evaluation_signatures.evaluation_id',
                        'planika_maloprodaja_evaluation_signatures.user_id',
                        'planika_maloprodaja_evaluation_signatures.signature_type',
                        'planika_maloprodaja_evaluation_signatures.signature_data',
                        'planika_maloprodaja_evaluation_signatures.signature_hash',
                        'planika_maloprodaja_evaluation_signatures.signed_at',
                        'planika_maloprodaja_evaluation_signatures.created_at',
                        'planika_maloprodaja_evaluation_signatures.updated_at',
                        'planika_maloprodaja_evaluation_signatures.ip_address',
                        'users.name as user_name', 
                        'users.email as user_email'
                    )
                    ->get();
                
                Log::info('PDF Generation - Signatures query result', [
                    'evaluation_id' => $id,
                    'signatures_count' => $signatures->count(),
                    'signatures' => $signatures->map(function($s) {
                        return [
                            'id' => $s->id ?? null,
                            'signature_type' => $s->signature_type ?? null,
                            'user_id' => $s->user_id ?? null,
                            'user_name' => $s->user_name ?? null,
                            'has_signature_data' => isset($s->signature_data) && !empty($s->signature_data),
                            'signed_at' => $s->signed_at ?? null,
                            'created_at' => $s->created_at ?? null,
                        ];
                    })->toArray(),
                ]);
                
                // Debug: Log signatures before processing
                Log::info('PDF Generation - Signatures found', [
                    'evaluation_id' => $id,
                    'signatures_count' => $signatures->count(),
                    'signatures' => $signatures->map(function($s) {
                        return [
                            'id' => $s->id ?? null,
                            'signature_type' => $s->signature_type ?? null,
                            'has_signature_data' => !empty($s->signature_data),
                            'signature_data_length' => isset($s->signature_data) ? strlen($s->signature_data) : 0,
                            'signed_at' => $s->signed_at ?? null,
                            'created_at' => $s->created_at ?? null,
                            'user_name' => $s->user_name ?? null,
                        ];
                    })->toArray()
                ]);
                
                // Ensure signed_at is properly formatted
                $signatures = $signatures->map(function ($signature) use ($id) {
                    // Debug: Log individual signature processing
                    Log::info('PDF Generation - Processing signature', [
                        'evaluation_id' => $id,
                        'signature_id' => $signature->id ?? null,
                        'signature_type' => $signature->signature_type ?? null,
                        'signed_at_raw' => $signature->signed_at ?? null,
                        'created_at_raw' => $signature->created_at ?? null,
                        'has_signature_data' => !empty($signature->signature_data),
                    ]);
                    
                    // Ensure signed_at is available, use created_at as fallback
                    if (!$signature->signed_at && $signature->created_at) {
                        $signature->signed_at = $signature->created_at;
                        Log::info('PDF Generation - Using created_at as signed_at', [
                            'signature_id' => $signature->id ?? null,
                            'created_at' => $signature->created_at,
                        ]);
                    }
                    
                    // Keep original signature_data for direct base64 usage in PDF
                    // Also prepare file path if needed
                    if ($signature->signature_data) {
                        $signatureData = $signature->signature_data;
                        
                        // Remove data URI prefix if present for processing
                        $base64Data = $signatureData;
                        if (strpos($signatureData, 'data:image/') === 0) {
                            $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $signatureData);
                            Log::info('PDF Generation - Removed data URI prefix', [
                                'signature_id' => $signature->id ?? null,
                                'original_length' => strlen($signatureData),
                                'base64_length' => strlen($base64Data),
                            ]);
                        }
                        
                        // Store clean base64 data for PDF template
                        $signature->signature_base64 = $base64Data;
                        
                        // Also create temporary file as backup
                        try {
                            $imageData = base64_decode($base64Data, true); // strict mode
                            if ($imageData !== false && strlen($imageData) > 0) {
                                $storageDir = storage_path('app/temp/signatures');
                                if (!file_exists($storageDir)) {
                                    mkdir($storageDir, 0755, true);
                                }
                                $tempPath = $storageDir . '/signature_' . $signature->id . '_' . time() . '.png';
                                $written = file_put_contents($tempPath, $imageData);
                                if ($written !== false) {
                                    $signature->signature_image_path = $tempPath;
                                    Log::info('PDF Generation - Created temp signature file', [
                                        'signature_id' => $signature->id ?? null,
                                        'temp_path' => $tempPath,
                                        'file_size' => $written,
                                    ]);
                                } else {
                                    Log::warning('PDF Generation - Failed to write temp signature file', [
                                        'signature_id' => $signature->id ?? null,
                                        'temp_path' => $tempPath,
                                    ]);
                                }
                            } else {
                                Log::warning('PDF Generation - Failed to decode base64 signature', [
                                    'signature_id' => $signature->id ?? null,
                                    'base64_length' => strlen($base64Data),
                                ]);
                            }
                        } catch (\Exception $e) {
                            Log::warning('PDF Generation - Exception processing signature image', [
                                'signature_id' => $signature->id ?? null,
                                'error' => $e->getMessage(),
                                'trace' => $e->getTraceAsString(),
                            ]);
                        }
                    } else {
                        Log::warning('PDF Generation - Signature has no signature_data', [
                            'signature_id' => $signature->id ?? null,
                            'signature_type' => $signature->signature_type ?? null,
                        ]);
                    }
                    
                    return $signature;
                });
                
                // Debug: Log signatures after processing
                Log::info('PDF Generation - Signatures after processing', [
                    'evaluation_id' => $id,
                    'signatures' => $signatures->map(function($s) {
                        return [
                            'id' => $s->id ?? null,
                            'signature_type' => $s->signature_type ?? null,
                            'has_signature_base64' => isset($s->signature_base64) && !empty($s->signature_base64),
                            'has_signature_image_path' => isset($s->signature_image_path) && file_exists($s->signature_image_path ?? ''),
                            'signed_at' => $s->signed_at ?? null,
                            'created_at' => $s->created_at ?? null,
                        ];
                    })->toArray()
                ]);
            } else {
                Log::warning('PDF Generation - Signatures table does not exist', [
                    'evaluation_id' => $id,
                ]);
            }

            // Debug: Log evaluation data
            Log::info('PDF Generation - Evaluation data', [
                'evaluation_id' => $id,
                'signature_status' => $evaluation->signature_status ?? null,
                'evaluator_id' => $evaluation->evaluator_id ?? null,
                'evaluator_name' => $evaluation->evaluator->name ?? ($evaluation->evaluator_name ?? null),
            ]);
            
            $data = [
                'evaluation' => $evaluation,
                'employee' => $employee,
                'signatures' => $signatures,
            ];
            
            // Debug: Log data being passed to view
            Log::info('PDF Generation - Data passed to view', [
                'evaluation_id' => $id,
                'has_evaluation' => isset($data['evaluation']),
                'has_employee' => isset($data['employee']),
                'signatures_count' => $data['signatures']->count(),
            ]);

            $pdf = Pdf::loadView('evaluations.pdf', $data);
            return $pdf->download("evaluation_{$id}.pdf");
        } catch (\Exception $e) {
            Log::error('Error generating evaluation PDF', [
                'error' => $e->getMessage(), 
                'trace' => $e->getTraceAsString(),
                'evaluation_id' => $id
            ]);
            return response()->json(['error' => 'Failed to generate PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Determine rating based on average score
     */
    private function determineRating($averageScore)
    {
        if ($averageScore >= 4.5) {
            return 'odličan';
        } elseif ($averageScore >= 3.5) {
            return 'dobar';
        } elseif ($averageScore >= 2.5) {
            return 'zadovoljavajući';
        } else {
            return 'treba poboljšanje';
        }
    }

    // ==================== MANAGER EVALUATIONS ====================

    /**
     * Get all manager evaluations
     */
    public function getManagerEvaluations(Request $request)
    {
        $query = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'planika_maloprodaja_stores.id')
            ->leftJoin('users as evaluator_user', 'planika_maloprodaja_employee_evaluations.evaluator_id', '=', 'evaluator_user.id')
            ->where(function($q) {
                $q->where('planika_maloprodaja_employee_evaluations.type', 'manager')
                  ->orWhereNull('planika_maloprodaja_employee_evaluations.type'); // For backward compatibility
            })
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as manager_name',
                'planika_maloprodaja_stores.name as store_name',
                'evaluator_user.name as evaluator_name'
            )
            ->orderBy('planika_maloprodaja_employee_evaluations.evaluation_date', 'desc');

        $evaluations = $query->get()->map(function($eval) {
            $eval->scores = json_decode($eval->scores ?? '{}', true);
            $eval->comments = json_decode($eval->comments ?? '{}', true);
            $eval->recommendations = $eval->recommendations ? json_decode($eval->recommendations, true) : null;
            $eval->total_score = array_sum(array_values($eval->scores ?? []));
            return $eval;
        });

        return response()->json($evaluations);
    }

    /**
     * Create manager evaluation
     */
    public function createManagerEvaluation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'manager_id' => 'required|exists:hrm_employees,id',
            'store_id' => 'required',
            'evaluator_name' => 'required|string|max:255',
            'evaluation_date' => 'required|date',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'scores' => 'required',
            'comments' => 'nullable',
            'recommendations' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if store exists in planika_maloprodaja_stores
        $storeId = $request->input('store_id');
        $store = DB::table('planika_maloprodaja_stores')->find($storeId);
        
        // If not found by ID, check hrm_stores and create in planika_maloprodaja_stores if it belongs to maloprodaja department
        if (!$store) {
            $hrmStore = DB::table('hrm_stores')->find($storeId);
            
            // First check if store already exists in planika_maloprodaja_stores by code or name (from hrm_stores)
            if ($hrmStore) {
                $existingStore = null;
                if ($hrmStore->code) {
                    $existingStore = DB::table('planika_maloprodaja_stores')
                        ->where('code', $hrmStore->code)
                        ->first();
                }
                
                if (!$existingStore) {
                    $existingStore = DB::table('planika_maloprodaja_stores')
                        ->where('name', $hrmStore->name)
                        ->first();
                }
                
                if ($existingStore) {
                    // Store already exists in planika_maloprodaja_stores, use its ID
                    $storeId = $existingStore->id;
                    $store = $existingStore;
                }
            }
            
            if (!$hrmStore) {
                return response()->json(['errors' => ['store_id' => ['Prodavnica ne postoji u sistemu']]], 422);
            }
            
            // Check if store belongs to maloprodaja department
            // Get maloprodaja department ID (assuming department name contains "maloprodaja" or similar)
            $maloprodajaDept = DB::table('hrm_departments')
                ->where('name', 'like', '%maloprodaja%')
                ->orWhere('name', 'like', '%Maloprodaja%')
                ->first();
            
            if ($hrmStore->department_id && $maloprodajaDept && $hrmStore->department_id == $maloprodajaDept->id) {
                // If store was already found by code/name check above, skip creation
                if (!$store) {
                    // Create store in planika_maloprodaja_stores
                    // First, we need a region - get or create default region
                    $defaultRegion = DB::table('planika_maloprodaja_regions')
                        ->where('department_id', $hrmStore->department_id)
                        ->first();
                    
                    if (!$defaultRegion) {
                        // Create default region for this department
                        $regionId = DB::table('planika_maloprodaja_regions')->insertGetId([
                            'name' => 'Default Region',
                            'code' => 'DEFAULT_' . $hrmStore->department_id,
                            'department_id' => $hrmStore->department_id,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $regionId = $defaultRegion->id;
                    }
                    
                    // Generate unique code if code already exists
                    $storeCode = $hrmStore->code ?? 'STORE_' . $storeId;
                    $codeExists = DB::table('planika_maloprodaja_stores')
                        ->where('code', $storeCode)
                        ->exists();
                    
                    if ($codeExists) {
                        // Append timestamp or random number to make it unique
                        $storeCode = $storeCode . '_' . time();
                    }
                    
                    // Create store in planika_maloprodaja_stores
                    $newStoreId = DB::table('planika_maloprodaja_stores')->insertGetId([
                        'name' => $hrmStore->name,
                        'code' => $storeCode,
                        'region_id' => $regionId,
                        'department_id' => $hrmStore->department_id,
                        'store_manager_id' => $hrmStore->store_manager_id ?? null,
                        'address' => $hrmStore->address ?? null,
                        'city' => $hrmStore->city ?? null,
                        'phone' => $hrmStore->phone ?? null,
                        'email' => $hrmStore->email ?? null,
                        'is_active' => $hrmStore->is_active ?? true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    // Use the new store ID
                    $storeId = $newStoreId;
                }
            } else {
                return response()->json(['errors' => ['store_id' => ['Prodavnica ne pripada odjelu maloprodaja']]], 422);
            }
        }

        // Handle scores - can be object (associative array) or array
        $scoresInput = $request->input('scores', []);
        // Convert to array for calculation
        $scoresArray = is_array($scoresInput) ? array_values($scoresInput) : [];
        $totalScore = array_sum($scoresArray);
        // Keep original format for storage (object/associative array)
        $scores = is_array($scoresInput) ? $scoresInput : [];
        $category = $totalScore >= 90 ? 'A' : ($totalScore >= 80 ? 'B' : 'C');

        // Get or create default evaluation criteria for managers
        $defaultCriteria = DB::table('planika_maloprodaja_evaluation_criteria')
            ->where('employee_type', 'store_manager')
            ->where('is_active', true)
            ->first();
        
        if (!$defaultCriteria) {
            // Create default criteria if doesn't exist
            $defaultCriteriaId = DB::table('planika_maloprodaja_evaluation_criteria')->insertGetId([
                'name' => 'Manager Evaluation Criteria',
                'employee_type' => 'store_manager',
                'criteria' => json_encode([]),
                'rating_type' => 'numeric',
                'max_rating' => 5,
                'is_active' => true,
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $defaultCriteriaId = $defaultCriteria->id;
        }

        $data = [
            'employee_id' => $request->input('manager_id'),
            'store_id' => $storeId, // Use the store ID (either existing or newly created)
            'evaluator_id' => $request->user()->id,
            'evaluation_criteria_id' => $defaultCriteriaId,
            'evaluation_date' => $request->input('evaluation_date'),
            'period_start' => $request->input('period_start'),
            'period_end' => $request->input('period_end'),
            'scores' => json_encode($scores),
            'comments' => json_encode($request->input('comments', [])),
            'average_score' => $totalScore,
            'rating' => $category,
            'overall_comment' => $request->input('recommendations'),
            'recommendations' => json_encode([$request->input('recommendations')]),
            'status' => 'completed',
            'type' => 'manager',
            'category' => $category,
            'evaluator_name' => $request->input('evaluator_name'),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $evaluationId = DB::table('planika_maloprodaja_employee_evaluations')->insertGetId($data);

        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'planika_maloprodaja_stores.id')
            ->where('planika_maloprodaja_employee_evaluations.id', $evaluationId)
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as manager_name',
                'planika_maloprodaja_stores.name as store_name'
            )
            ->first();

        $evaluation->scores = json_decode($evaluation->scores, true);
        $evaluation->comments = json_decode($evaluation->comments, true);
        $evaluation->total_score = $totalScore;

        $this->logAudit('created', 'employee_evaluation', $evaluationId, $request->user()->id, null, $data, 'Manager evaluation created');

        return response()->json($evaluation, 201);
    }

    /**
     * Update manager evaluation
     */
    public function updateManagerEvaluation(Request $request, $id)
    {
        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')->find($id);

        if (!$evaluation) {
            return response()->json(['message' => 'Evaluation not found'], 404);
        }

        // Check if evaluation is locked (completed) - allow only signature_status update
        $isLocked = isset($evaluation->signature_status) && $evaluation->signature_status === 'completed';
        $isOnlyLocking = $request->has('signature_status') && 
                        $request->input('signature_status') === 'completed' && 
                        (isset($evaluation->signature_status) && ($evaluation->signature_status === 'evaluator_signed' || $evaluation->signature_status === 'completed'));
        
        // If locked, only allow signature_status update to completed (if not already completed)
        if ($isLocked && !$isOnlyLocking) {
            // Check if only signature_status is being updated to completed
            $onlySignatureStatusUpdate = $request->has('signature_status') && 
                                        $request->input('signature_status') === 'completed' &&
                                        count($request->all()) <= 2; // Allow status and signature_status
            
            if (!$onlySignatureStatusUpdate) {
                return response()->json(['message' => 'Evaluation is locked and cannot be modified'], 422);
            }
        }
        
        // If evaluator_signed, only allow updating to completed
        if (isset($evaluation->signature_status) && $evaluation->signature_status === 'evaluator_signed' && !$isOnlyLocking) {
            // Check if trying to update other fields
            $hasOtherFields = $request->has('scores') || 
                             $request->has('comments') || 
                             ($request->has('recommendations') && $request->input('recommendations') !== json_decode($evaluation->recommendations ?? '[]', true));
            
            if ($hasOtherFields) {
                return response()->json(['message' => 'Evaluation is signed by evaluator and cannot be modified'], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'scores' => 'sometimes|array',
            'comments' => 'nullable|array',
            'recommendations' => 'nullable|string',
            'status' => 'sometimes|in:draft,completed,acknowledged',
            'signature_status' => 'sometimes|in:draft,evaluator_signed,employee_signed,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = (array) $evaluation;

        $updateData = [];
        
        // Only allow updating scores/comments/recommendations if not locked
        if (!$isLocked) {
            if ($request->has('scores')) {
                $scores = $request->input('scores');
                $totalScore = array_sum(array_values($scores));
                $category = $totalScore >= 90 ? 'A' : ($totalScore >= 80 ? 'B' : 'C');
                
                $updateData['scores'] = json_encode($scores);
                $updateData['average_score'] = $totalScore;
                $updateData['rating'] = $category;
                $updateData['category'] = $category;
            }

            if ($request->has('comments')) {
                $updateData['comments'] = json_encode($request->input('comments'));
            }

            if ($request->has('recommendations')) {
                $updateData['overall_comment'] = $request->input('recommendations');
                $updateData['recommendations'] = json_encode([$request->input('recommendations')]);
            }
        }

        // Always allow status and signature_status updates
        if ($request->has('status')) {
            $updateData['status'] = $request->input('status');
        }
        
        if ($request->has('signature_status')) {
            $updateData['signature_status'] = $request->input('signature_status');
        }

        $updateData['updated_at'] = now();

        DB::table('planika_maloprodaja_employee_evaluations')
            ->where('id', $id)
            ->update($updateData);

        $this->logAudit('updated', 'employee_evaluation', $id, $request->user()->id, $oldValues, $updateData, 'Manager evaluation updated');

        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'planika_maloprodaja_stores.id')
            ->where('planika_maloprodaja_employee_evaluations.id', $id)
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as manager_name',
                'planika_maloprodaja_stores.name as store_name'
            )
            ->first();

        $evaluation->scores = json_decode($evaluation->scores, true);
        $evaluation->comments = json_decode($evaluation->comments ?? '{}', true);
        $evaluation->total_score = array_sum(array_values($evaluation->scores ?? []));

        return response()->json($evaluation);
    }

    // ==================== SALES STAFF EVALUATIONS ====================

    /**
     * Get all sales staff evaluations
     */
    public function getSalesStaffEvaluations(Request $request)
    {
        $query = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('hrm_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'hrm_stores.id')
            ->leftJoin('users as evaluator_user', 'planika_maloprodaja_employee_evaluations.evaluator_id', '=', 'evaluator_user.id')
            ->where('planika_maloprodaja_employee_evaluations.type', 'sales_staff')
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as employee_name',
                'hrm_stores.name as store_name',
                'evaluator_user.name as evaluator_name'
            )
            ->orderBy('planika_maloprodaja_employee_evaluations.evaluation_date', 'desc');

        $evaluations = $query->get()->map(function($eval) {
            $eval->scores = json_decode($eval->scores ?? '{}', true);
            $eval->comments = json_decode($eval->comments ?? '{}', true);
            $eval->recommendations = $eval->recommendations ? json_decode($eval->recommendations, true) : null;
            $eval->total_score = array_sum(array_values($eval->scores ?? []));
            return $eval;
        });

        return response()->json($evaluations);
    }

    /**
     * Create sales staff evaluation
     */
    public function createSalesStaffEvaluation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'store_id' => 'required|exists:hrm_stores,id',
            'position' => 'required|string|max:255',
            'evaluator_name' => 'required|string|max:255',
            'evaluation_date' => 'required|date',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'scores' => 'required|array',
            'comments' => 'nullable|array',
            'recommendations' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $scores = $request->input('scores', []);
        $totalScore = array_sum(array_values($scores));
        $category = $totalScore >= 90 ? 'A' : ($totalScore >= 80 ? 'B' : 'C');

        // Get or create default evaluation criteria for sales staff
        $defaultCriteria = DB::table('planika_maloprodaja_evaluation_criteria')
            ->where('employee_type', 'salesperson')
            ->where('is_active', true)
            ->first();
        
        if (!$defaultCriteria) {
            // Create default criteria if doesn't exist
            $defaultCriteriaId = DB::table('planika_maloprodaja_evaluation_criteria')->insertGetId([
                'name' => 'Sales Staff Evaluation Criteria',
                'employee_type' => 'salesperson',
                'criteria' => json_encode([]),
                'rating_type' => 'numeric',
                'max_rating' => 5,
                'is_active' => true,
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $defaultCriteriaId = $defaultCriteria->id;
        }

        $data = [
            'employee_id' => $request->input('employee_id'),
            'store_id' => $request->input('store_id'),
            'evaluator_id' => $request->user()->id,
            'evaluation_criteria_id' => $defaultCriteriaId,
            'evaluation_date' => $request->input('evaluation_date'),
            'period_start' => $request->input('period_start'),
            'period_end' => $request->input('period_end'),
            'scores' => json_encode($scores),
            'comments' => json_encode($request->input('comments', [])),
            'average_score' => $totalScore,
            'rating' => $category,
            'overall_comment' => $request->input('recommendations'),
            'recommendations' => json_encode([$request->input('recommendations')]),
            'status' => 'completed',
            'type' => 'sales_staff',
            'category' => $category,
            'position' => $request->input('position'),
            'evaluator_name' => $request->input('evaluator_name'),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $evaluationId = DB::table('planika_maloprodaja_employee_evaluations')->insertGetId($data);

        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('hrm_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'hrm_stores.id')
            ->where('planika_maloprodaja_employee_evaluations.id', $evaluationId)
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as employee_name',
                'hrm_stores.name as store_name'
            )
            ->first();

        $evaluation->scores = json_decode($evaluation->scores, true);
        $evaluation->comments = json_decode($evaluation->comments, true);
        $evaluation->total_score = $totalScore;

        $this->logAudit('created', 'employee_evaluation', $evaluationId, $request->user()->id, null, $data, 'Sales staff evaluation created');

        return response()->json($evaluation, 201);
    }

    /**
     * Update sales staff evaluation
     */
    public function updateSalesStaffEvaluation(Request $request, $id)
    {
        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')->find($id);

        if (!$evaluation) {
            return response()->json(['message' => 'Evaluation not found'], 404);
        }

        // Check if evaluation is locked (completed) - allow only signature_status update
        $isLocked = isset($evaluation->signature_status) && $evaluation->signature_status === 'completed';
        $isOnlyLocking = $request->has('signature_status') && 
                        $request->input('signature_status') === 'completed' && 
                        (isset($evaluation->signature_status) && ($evaluation->signature_status === 'evaluator_signed' || $evaluation->signature_status === 'completed'));
        
        // If locked, only allow signature_status update to completed (if not already completed)
        if ($isLocked && !$isOnlyLocking) {
            $onlySignatureStatusUpdate = $request->has('signature_status') && 
                                        $request->input('signature_status') === 'completed' &&
                                        count($request->all()) <= 2;
            
            if (!$onlySignatureStatusUpdate) {
                return response()->json(['message' => 'Evaluation is locked and cannot be modified'], 422);
            }
        }
        
        // If evaluator_signed, only allow updating to completed
        if (isset($evaluation->signature_status) && $evaluation->signature_status === 'evaluator_signed' && !$isOnlyLocking) {
            $hasOtherFields = $request->has('scores') || 
                             $request->has('comments') || 
                             ($request->has('recommendations') && $request->input('recommendations') !== json_decode($evaluation->recommendations ?? '[]', true));
            
            if ($hasOtherFields) {
                return response()->json(['message' => 'Evaluation is signed by evaluator and cannot be modified'], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'scores' => 'sometimes|array',
            'comments' => 'nullable|array',
            'recommendations' => 'nullable|string',
            'status' => 'sometimes|in:draft,completed,acknowledged',
            'signature_status' => 'sometimes|in:draft,evaluator_signed,employee_signed,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = (array) $evaluation;

        $updateData = [];
        
        // Only allow updating scores/comments/recommendations if not locked
        if (!$isLocked) {
            if ($request->has('scores')) {
                $scores = $request->input('scores');
                $totalScore = array_sum(array_values($scores));
                $category = $totalScore >= 90 ? 'A' : ($totalScore >= 80 ? 'B' : 'C');
                
                $updateData['scores'] = json_encode($scores);
                $updateData['average_score'] = $totalScore;
                $updateData['rating'] = $category;
                $updateData['category'] = $category;
            }

            if ($request->has('comments')) {
                $updateData['comments'] = json_encode($request->input('comments'));
            }

            if ($request->has('recommendations')) {
                $updateData['overall_comment'] = $request->input('recommendations');
                $updateData['recommendations'] = json_encode([$request->input('recommendations')]);
            }
        }

        // Always allow status and signature_status updates
        if ($request->has('status')) {
            $updateData['status'] = $request->input('status');
        }
        
        if ($request->has('signature_status')) {
            $updateData['signature_status'] = $request->input('signature_status');
        }

        $updateData['updated_at'] = now();

        DB::table('planika_maloprodaja_employee_evaluations')
            ->where('id', $id)
            ->update($updateData);

        $this->logAudit('updated', 'employee_evaluation', $id, $request->user()->id, $oldValues, $updateData, 'Sales staff evaluation updated');

        $evaluation = DB::table('planika_maloprodaja_employee_evaluations')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_employee_evaluations.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_employee_evaluations.store_id', '=', 'planika_maloprodaja_stores.id')
            ->where('planika_maloprodaja_employee_evaluations.id', $id)
            ->select(
                'planika_maloprodaja_employee_evaluations.*',
                'emp_user.name as employee_name',
                'planika_maloprodaja_stores.name as store_name'
            )
            ->first();

        $evaluation->scores = json_decode($evaluation->scores, true);
        $evaluation->comments = json_decode($evaluation->comments ?? '{}', true);
        $evaluation->total_score = array_sum(array_values($evaluation->scores ?? []));

        return response()->json($evaluation);
    }

    // ==================== REPORTS ====================

    /**
     * Get reports data
     */
    public function getReports(Request $request)
    {
        try {
            $type = $request->input('type', 'overview'); // overview, region, store, employee

            $data = [];

            switch ($type) {
                case 'overview':
                    $data = $this->getOverviewReport();
                    break;
                case 'region':
                    $regionId = $request->input('region_id');
                    $data = $this->getRegionReport($regionId);
                    break;
                case 'store':
                    $storeId = $request->input('store_id');
                    $data = $this->getStoreReport($storeId);
                    break;
                case 'employee':
                    $employeeId = $request->input('employee_id');
                    $data = $this->getEmployeeReport($employeeId);
                    break;
            }

            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error('Error in getReports: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju izvještaja',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    private function getOverviewReport()
    {
        if (!$this->planikaTablesExist()) {
            return [
                'total_regions' => 0,
                'total_stores' => 0,
                'active_plans' => 0,
                'completed_controls' => 0,
                'total_evaluations' => 0,
                'recent_controls' => [],
            ];
        }

        try {
            return [
                'total_regions' => Region::count(),
                'total_stores' => Store::count(),
                'active_plans' => ActivityPlan::where('status', 'active')->count(),
                'completed_controls' => StoreControl::where('status', 'completed')->count(),
                'total_evaluations' => EmployeeEvaluation::count(),
                'recent_controls' => StoreControl::with(['store', 'controller'])
                    ->orderBy('control_date', 'desc')
                    ->limit(10)
                    ->get(),
            ];
        } catch (\Exception $e) {
            \Log::error('Error in getOverviewReport: ' . $e->getMessage());
            return [
                'total_regions' => 0,
                'total_stores' => 0,
                'active_plans' => 0,
                'completed_controls' => 0,
                'total_evaluations' => 0,
                'recent_controls' => [],
            ];
        }
    }

    private function getRegionReport($regionId)
    {
        $region = Region::with(['stores', 'regionalManager'])->find($regionId);
        
        if (!$region) {
            return null;
        }

        $stores = Store::where('region_id', $regionId)->pluck('id');
        
        return [
            'region' => $region,
            'total_stores' => $stores->count(),
            'controls' => StoreControl::whereIn('store_id', $stores)
                ->with(['store', 'controller'])
                ->orderBy('control_date', 'desc')
                ->get(),
            'evaluations' => EmployeeEvaluation::whereIn('store_id', $stores)
                ->with(['store', 'evaluator'])
                ->orderBy('evaluation_date', 'desc')
                ->get(),
        ];
    }

    private function getStoreReport($storeId)
    {
        $store = Store::with(['region', 'storeManager'])->find($storeId);
        
        if (!$store) {
            return null;
        }

        return [
            'store' => $store,
            'controls' => StoreControl::where('store_id', $storeId)
                ->with(['controlForm', 'controller'])
                ->orderBy('control_date', 'desc')
                ->get(),
            'evaluations' => EmployeeEvaluation::where('store_id', $storeId)
                ->with(['evaluator', 'criteria'])
                ->orderBy('evaluation_date', 'desc')
                ->get(),
        ];
    }

    private function getEmployeeReport($employeeId)
    {
        $employee = DB::table('hrm_employees')
            ->join('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where('hrm_employees.id', $employeeId)
            ->select('hrm_employees.*', 'users.name', 'users.email')
            ->first();

        if (!$employee) {
            return null;
        }

        $evaluations = EmployeeEvaluation::where('employee_id', $employeeId)
            ->with(['store', 'evaluator', 'criteria'])
            ->orderBy('evaluation_date', 'desc')
            ->get();

        return [
            'employee' => $employee,
            'evaluations' => $evaluations,
            'average_score' => $evaluations->avg('average_score'),
            'total_evaluations' => $evaluations->count(),
        ];
    }

    // ==================== AUDIT LOGS ====================

    /**
     * Get audit logs
     */
    public function getAuditLogs(Request $request)
    {
        $query = AuditLog::with('user');

        if ($request->has('entity_type')) {
            $query->where('entity_type', $request->input('entity_type'));
        }

        if ($request->has('entity_id')) {
            $query->where('entity_id', $request->input('entity_id'));
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json($logs);
    }

    // ==================== STORE CATEGORIZATION ====================

    /**
     * Update store category
     */
    public function updateStoreCategory(Request $request, $id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'category' => 'required|in:A,B,C',
            'categorization_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Save history
        StoreCategoryHistory::create([
            'store_id' => $store->id,
            'category' => $store->category,
            'categorization_data' => $store->categorization_data,
            'updated_by' => $request->user()->id,
            'changed_at' => now(),
        ]);

        // Update store
        $oldCategory = $store->category;
        $store->update([
            'category' => $request->input('category'),
            'categorization_data' => $request->input('categorization_data'),
            'category_updated_at' => now(),
        ]);

        $this->logAudit('updated', 'store', $store->id, $request->user()->id, 
            ['category' => $oldCategory], 
            ['category' => $store->category], 
            'Store category updated'
        );

        return response()->json($store);
    }

    /**
     * Auto-categorize stores based on criteria
     */
    public function autoCategorizeStores(Request $request)
    {
        $stores = Store::where('is_active', true)->get();
        $updated = 0;

        foreach ($stores as $store) {
            // Get store statistics
            $controls = StoreControl::where('store_id', $store->id)->get();
            $averageScore = $controls->avg('percentage_score') ?? 0;

            // Simple categorization logic (can be enhanced)
            $newCategory = 'B';
            if ($averageScore >= 80) {
                $newCategory = 'A';
            } elseif ($averageScore < 60) {
                $newCategory = 'C';
            }

            if ($store->category !== $newCategory) {
                StoreCategoryHistory::create([
                    'store_id' => $store->id,
                    'category' => $store->category,
                    'categorization_data' => $store->categorization_data,
                    'updated_by' => $request->user()->id,
                    'changed_at' => now(),
                ]);

                $store->update([
                    'category' => $newCategory,
                    'category_updated_at' => now(),
                ]);
                $updated++;
            }
        }

        return response()->json(['message' => "Categorized {$updated} stores"]);
    }

    // ==================== VISIT SCHEDULES (KALENDAR OBILAZAKA) ====================

    /**
     * Generate visit schedule for plan
     */
    public function generateVisitSchedule(Request $request, $planId)
    {
        $plan = ActivityPlan::find($planId);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found'], 404);
        }

        // Get stores based on plan targets
        $stores = [];
        if ($plan->target_stores && count($plan->target_stores) > 0) {
            $stores = Store::whereIn('id', $plan->target_stores)
                ->where('is_active', true)
                ->get();
        } elseif ($plan->target_regions && count($plan->target_regions) > 0) {
            $stores = Store::whereIn('region_id', $plan->target_regions)
                ->where('is_active', true)
                ->get();
        }

        // Calculate visit frequency based on plan type and store category
        $schedules = [];
        $startDate = new \DateTime($plan->start_date);
        $endDate = new \DateTime($plan->end_date);

        foreach ($stores as $store) {
            $frequency = $this->getVisitFrequency($plan->plan_type, $store->category);

            $currentDate = clone $startDate;
            $visitOrder = 1;

            while ($currentDate <= $endDate) {
                // Calculate scheduled date based on frequency
                $scheduledDate = null;
                if ($frequency === 'twice_monthly') {
                    // 2x mjesecno - 1. i 15. u mjesecu
                    $day = $currentDate->format('d');
                    if ($day <= 15) {
                        $scheduledDate = clone $currentDate;
                        $scheduledDate->setDate($currentDate->format('Y'), $currentDate->format('m'), 1);
                    } else {
                        $scheduledDate = clone $currentDate;
                        $scheduledDate->setDate($currentDate->format('Y'), $currentDate->format('m'), 15);
                    }
                    $currentDate->modify('+1 month');
                } elseif ($frequency === 'monthly') {
                    // 1x mjesecno
                    $scheduledDate = clone $currentDate;
                    $currentDate->modify('+1 month');
                } elseif ($frequency === 'quarterly') {
                    // 1x kvartalno
                    $scheduledDate = clone $currentDate;
                    $currentDate->modify('+3 months');
                } else {
                    // Custom frequency
                    $scheduledDate = clone $currentDate;
                    $currentDate->modify('+1 week');
                }

                if ($scheduledDate && $scheduledDate <= $endDate) {
                    $schedule = VisitSchedule::create([
                        'plan_id' => $plan->id,
                        'store_id' => $store->id,
                        'assigned_to' => $plan->assignments->first()->regional_manager_id ?? null,
                        'scheduled_date' => $scheduledDate->format('Y-m-d'),
                        'estimated_duration_minutes' => 60,
                        'status' => 'planned',
                        'visit_order' => $visitOrder++,
                    ]);

                    $schedules[] = $schedule;

                    // Create reminder
                    $reminderDate = clone $scheduledDate;
                    $reminderDate->modify('-1 day');
                    VisitReminder::create([
                        'schedule_id' => $schedule->id,
                        'user_id' => $schedule->assigned_to,
                        'reminder_time' => $reminderDate,
                        'reminder_type' => 'before_visit',
                    ]);
                }
            }
        }

        $this->logAudit('created', 'visit_schedule', $plan->id, $request->user()->id, null, 
            ['count' => count($schedules)], 'Visit schedule generated'
        );

        return response()->json(['schedules' => $schedules, 'count' => count($schedules)], 201);
    }

    /**
     * Get visit schedules
     */
    public function getVisitSchedules(Request $request)
    {
        $query = VisitSchedule::with(['plan', 'store', 'assignedUser']);

        if ($request->has('plan_id')) {
            $query->where('plan_id', $request->input('plan_id'));
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->input('store_id'));
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('date_from')) {
            $query->where('scheduled_date', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('scheduled_date', '<=', $request->input('date_to'));
        }

        if ($request->has('date_from')) {
            $query->where('scheduled_date', '>=', $request->input('date_from'));
        }

        $schedules = $query->orderBy('scheduled_date', 'asc')->orderBy('scheduled_time', 'asc')->get();

        return response()->json($schedules);
    }

    /**
     * Get visit frequency based on plan type and store category
     */
    private function getVisitFrequency($planType, $storeCategory)
    {
        if ($planType === 'regular') {
            // Regular plan: A=2x/month, B=1x/month, C=1x/quarter
            if ($storeCategory === 'A') {
                return 'twice_monthly';
            } elseif ($storeCategory === 'B') {
                return 'monthly';
            } else {
                return 'quarterly';
            }
        } elseif ($planType === 'focused') {
            // Focused plan: more frequent
            return 'biweekly';
        } elseif ($planType === 'emergency') {
            // Emergency: immediate
            return 'immediate';
        } else {
            // Seasonal: based on campaign
            return 'monthly';
        }
    }

    // ==================== STORE VISITS (OBILASCI) ====================

    /**
     * Check in to store visit
     */
    public function checkInVisit(Request $request, $scheduleId)
    {
        $schedule = VisitSchedule::find($scheduleId);

        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'check_in_method' => 'nullable|in:GPS,QR_CODE',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Create or update visit
        $visit = StoreVisit::updateOrCreate(
            [
                'schedule_id' => $scheduleId,
                'store_id' => $schedule->store_id,
                'plan_id' => $schedule->plan_id,
                'visited_by' => $request->user()->id,
                'visit_date' => now()->format('Y-m-d'),
            ],
            [
                'check_in_time' => now(),
                'check_in_latitude' => $request->input('latitude'),
                'check_in_longitude' => $request->input('longitude'),
                'check_in_method' => $request->input('check_in_method', 'GPS'),
            ]
        );

        // Update schedule status
        $schedule->update(['status' => 'in_progress']);

        $this->logAudit('created', 'store_visit', $visit->id, $request->user()->id, null, 
            $visit->toArray(), 'Store visit check-in'
        );

        return response()->json($visit, 201);
    }

    /**
     * Check out from store visit
     */
    public function checkOutVisit(Request $request, $visitId)
    {
        $visit = StoreVisit::find($visitId);

        if (!$visit) {
            return response()->json(['message' => 'Visit not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'control_id' => 'nullable|exists:planika_maloprodaja_store_controls,id',
            'store_manager_evaluation_id' => 'nullable|exists:planika_maloprodaja_employee_evaluations,id',
            'visit_summary' => 'nullable|string',
            'photos' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $visit->update([
            'check_out_time' => now(),
            'control_id' => $request->input('control_id'),
            'store_manager_evaluation_id' => $request->input('store_manager_evaluation_id'),
            'visit_summary' => $request->input('visit_summary'),
            'photos' => $request->input('photos'),
        ]);

        // Update schedule status
        if ($visit->schedule_id) {
            VisitSchedule::where('id', $visit->schedule_id)->update(['status' => 'completed']);
        }

        $this->logAudit('updated', 'store_visit', $visit->id, $request->user()->id, null, 
            ['check_out_time' => $visit->check_out_time], 'Store visit check-out'
        );

        return response()->json($visit);
    }

    /**
     * Get store visits
     */
    public function getStoreVisits(Request $request)
    {
        $query = StoreVisit::with(['store', 'plan', 'visitor', 'control', 'storeManagerEvaluation']);

        if ($request->has('store_id')) {
            $query->where('store_id', $request->input('store_id'));
        }

        if ($request->has('visited_by')) {
            $query->where('visited_by', $request->input('visited_by'));
        }

        $visits = $query->orderBy('visit_date', 'desc')->get();

        return response()->json($visits);
    }

    // ==================== AUTOMATED SCENARIOS ====================

    /**
     * Check and trigger automated scenarios
     */
    public function checkAutomatedScenarios(Request $request)
    {
        $scenarios = [];

        // Scenario 1: Store score below 3.0 → auto focus plan
        $lowScoreStores = Store::where('is_active', true)->get()->filter(function ($store) {
            $lastControl = StoreControl::where('store_id', $store->id)
                ->orderBy('control_date', 'desc')
                ->first();
            return $lastControl && ($lastControl->total_score / 5) < 3.0;
        });

        foreach ($lowScoreStores as $store) {
            $scenarios[] = [
                'type' => 'low_score_focus_plan',
                'store_id' => $store->id,
                'store_name' => $store->name,
                'message' => 'Prodavnica ima ocjenu ispod 3.0 - preporučuje se fokus plan',
            ];
        }

        // Scenario 2: Missed visits → escalation
        $missedVisits = VisitSchedule::where('status', 'planned')
            ->where('scheduled_date', '<', now()->format('Y-m-d'))
            ->with('store')
            ->get();

        foreach ($missedVisits as $schedule) {
            VisitEscalation::create([
                'schedule_id' => $schedule->id,
                'escalation_reason' => 'missed_visit',
                'escalation_level' => 'regional_manager',
                'status' => 'pending',
            ]);

            $scenarios[] = [
                'type' => 'missed_visit_escalation',
                'schedule_id' => $schedule->id,
                'store_name' => $schedule->store->name,
                'message' => 'Obilazak nije izvršen u roku - eskalacija kreirana',
            ];
        }

        return response()->json(['scenarios' => $scenarios, 'count' => count($scenarios)]);
    }

    // ==================== TALENTS (Career Development) ====================

    /**
     * Get all talents
     */
    public function getTalents(Request $request)
    {
        $query = DB::table('planika_maloprodaja_talents')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_talents.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_talents.store_id', '=', 'planika_maloprodaja_stores.id')
            ->select(
                'planika_maloprodaja_talents.*',
                'emp_user.name as employee_name',
                'planika_maloprodaja_stores.name as store_name',
                'hrm_employees.position'
            )
            ->orderBy('planika_maloprodaja_talents.created_at', 'desc');

        $talents = $query->get()->map(function($talent) {
            $talent->development_activities = json_decode($talent->development_activities ?? '[]', true);
            $talent->competencies = json_decode($talent->competencies ?? '[]', true);
            return $talent;
        });

        return response()->json($talents);
    }

    /**
     * Create talent / development plan
     */
    public function createTalent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'performance_level' => 'required|in:low,medium,high',
            'potential_level' => 'required|in:low,medium,high',
            'development_activities' => 'nullable|array',
            'goals' => 'nullable|string',
            'target_completion' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get employee's store
        $employee = DB::table('hrm_employees')->find($request->input('employee_id'));
        $storeId = $employee->store_id ?? null;

        $data = [
            'employee_id' => $request->input('employee_id'),
            'store_id' => $storeId,
            'performance_level' => $request->input('performance_level'),
            'potential_level' => $request->input('potential_level'),
            'development_activities' => json_encode($request->input('development_activities', [])),
            'goals' => $request->input('goals'),
            'target_completion' => $request->input('target_completion'),
            'created_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $talentId = DB::table('planika_maloprodaja_talents')->insertGetId($data);

        $talent = DB::table('planika_maloprodaja_talents')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_talents.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->leftJoin('planika_maloprodaja_stores', 'planika_maloprodaja_talents.store_id', '=', 'planika_maloprodaja_stores.id')
            ->where('planika_maloprodaja_talents.id', $talentId)
            ->select(
                'planika_maloprodaja_talents.*',
                'emp_user.name as employee_name',
                'planika_maloprodaja_stores.name as store_name',
                'hrm_employees.position'
            )
            ->first();

        $talent->development_activities = json_decode($talent->development_activities, true);
        $talent->competencies = json_decode($talent->competencies ?? '[]', true);

        $this->logAudit('created', 'talent', $talentId, $request->user()->id, null, $data, 'Talent development plan created');

        return response()->json($talent, 201);
    }

    /**
     * Update talent / development plan
     */
    public function updateTalent(Request $request, $id)
    {
        $talent = DB::table('planika_maloprodaja_talents')->find($id);

        if (!$talent) {
            return response()->json(['message' => 'Talent not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'performance_level' => 'sometimes|in:low,medium,high',
            'potential_level' => 'sometimes|in:low,medium,high',
            'development_activities' => 'nullable|array',
            'goals' => 'nullable|string',
            'target_completion' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = (array) $talent;
        $updateData = $validator->validated();
        
        if (isset($updateData['development_activities'])) {
            $updateData['development_activities'] = json_encode($updateData['development_activities']);
        }
        
        $updateData['updated_at'] = now();

        DB::table('planika_maloprodaja_talents')
            ->where('id', $id)
            ->update($updateData);

        $this->logAudit('updated', 'talent', $id, $request->user()->id, $oldValues, $updateData, 'Talent development plan updated');

        return $this->getTalents($request);
    }

    // ==================== REWARDS AND BONUSES ====================

    /**
     * Get all rewards
     */
    public function getRewards(Request $request)
    {
        $query = DB::table('planika_maloprodaja_rewards')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_rewards.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->select(
                'planika_maloprodaja_rewards.*',
                'emp_user.name as employee_name'
            )
            ->orderBy('planika_maloprodaja_rewards.date', 'desc');

        if ($request->has('type')) {
            $query->where('planika_maloprodaja_rewards.type', $request->input('type'));
        }

        if ($request->has('status')) {
            $query->where('planika_maloprodaja_rewards.status', $request->input('status'));
        }

        return response()->json($query->get());
    }

    /**
     * Create reward
     */
    public function createReward(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'type' => 'required|in:financial,non_financial',
            'reward_type' => 'required|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'reason' => 'required|string',
            'date' => 'required|date',
            'status' => 'nullable|in:pending,approved,paid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['status'] = $data['status'] ?? 'pending';
        $data['created_by'] = $request->user()->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $rewardId = DB::table('planika_maloprodaja_rewards')->insertGetId($data);

        $reward = DB::table('planika_maloprodaja_rewards')
            ->leftJoin('hrm_employees', 'planika_maloprodaja_rewards.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users as emp_user', 'hrm_employees.user_id', '=', 'emp_user.id')
            ->where('planika_maloprodaja_rewards.id', $rewardId)
            ->select(
                'planika_maloprodaja_rewards.*',
                'emp_user.name as employee_name'
            )
            ->first();

        $this->logAudit('created', 'reward', $rewardId, $request->user()->id, null, $data, 'Reward created');

        return response()->json($reward, 201);
    }

    /**
     * Update reward
     */
    public function updateReward(Request $request, $id)
    {
        $reward = DB::table('planika_maloprodaja_rewards')->find($id);

        if (!$reward) {
            return response()->json(['message' => 'Reward not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:financial,non_financial',
            'reward_type' => 'sometimes|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'reason' => 'sometimes|string',
            'date' => 'sometimes|date',
            'status' => 'sometimes|in:pending,approved,paid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = (array) $reward;
        $updateData = $validator->validated();
        $updateData['updated_at'] = now();

        DB::table('planika_maloprodaja_rewards')
            ->where('id', $id)
            ->update($updateData);

        $this->logAudit('updated', 'reward', $id, $request->user()->id, $oldValues, $updateData, 'Reward updated');

        return $this->getRewards($request);
    }

    // ==================== SALES PLANS ====================

    /**
     * Get sales plans
     */
    public function getSalesPlans(Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $this->isAdmin($user);
            $userStoreId = $this->getUserStoreId($user);

            $query = DB::table('planika_maloprodaja_sales_plans')
                ->leftJoin('hrm_employees', 'planika_maloprodaja_sales_plans.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->leftJoin('hrm_stores', function($join) {
                    $join->on('hrm_employees.store', '=', 'hrm_stores.name')
                         ->orOn('hrm_employees.store', '=', 'hrm_stores.code');
                })
                ->select(
                    'planika_maloprodaja_sales_plans.*',
                    'hrm_employees.employee_id as employee_number',
                    'users.name as employee_name',
                    'hrm_stores.id as store_id',
                    'hrm_stores.name as store_name',
                    'hrm_stores.code as store_code'
                );

            // Filter by store if user is manager (not admin)
            if (!$isAdmin && $userStoreId) {
                $query->where('hrm_stores.id', $userStoreId);
            }

            if ($request->has('employee_id')) {
                $query->where('planika_maloprodaja_sales_plans.employee_id', $request->input('employee_id'));
            }

            if ($request->has('year')) {
                $query->where('planika_maloprodaja_sales_plans.year', $request->input('year'));
            }

            if ($request->has('month')) {
                $query->where('planika_maloprodaja_sales_plans.month', $request->input('month'));
            }

            if ($request->has('store_id')) {
                $query->where('hrm_stores.id', $request->input('store_id'));
            }

            $plans = $query->orderBy('planika_maloprodaja_sales_plans.year', 'desc')
                ->orderBy('planika_maloprodaja_sales_plans.month', 'desc')
                ->orderBy('employee_name', 'asc')
                ->get();

            return response()->json($plans);
        } catch (\Exception $e) {
            Log::error('Error in getSalesPlans: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju planova prodaje',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get single sales plan
     */
    public function getSalesPlan($id)
    {
        try {
            $plan = DB::table('planika_maloprodaja_sales_plans')
                ->leftJoin('hrm_employees', 'planika_maloprodaja_sales_plans.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->select(
                    'planika_maloprodaja_sales_plans.*',
                    'hrm_employees.employee_id as employee_number',
                    'users.name as employee_name'
                )
                ->where('planika_maloprodaja_sales_plans.id', $id)
                ->first();

            if (!$plan) {
                return response()->json(['message' => 'Sales plan not found'], 404);
            }

            return response()->json($plan);
        } catch (\Exception $e) {
            Log::error('Error in getSalesPlan: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju plana prodaje',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Create sales plan
     */
    public function createSalesPlan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:hrm_employees,id',
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'gross_salary' => 'nullable|numeric|min:0',
            'net_salary' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'planned_shoe_pairs' => 'nullable|integer|min:0',
            'planned_merchandise_pieces' => 'nullable|integer|min:0',
            'planned_revenue' => 'nullable|numeric|min:0',
            'revenue_currency' => 'nullable|string|max:10',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $request->user()->id;
        $data['currency'] = $data['currency'] ?? 'BAM';
        $data['revenue_currency'] = $data['revenue_currency'] ?? 'BAM';

        // Check if plan already exists
        $existing = DB::table('planika_maloprodaja_sales_plans')
            ->where('employee_id', $data['employee_id'])
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Plan već postoji za ovog zaposlenika za ovaj mjesec'], 409);
        }

        $planId = DB::table('planika_maloprodaja_sales_plans')->insertGetId($data);

        $this->logAudit('created', 'sales_plan', $planId, $request->user()->id, null, $data, 'Sales plan created');

        // Recalculate performance
        $this->recalculatePerformance($data['employee_id'], $data['year'], $data['month']);

        return $this->getSalesPlan($planId);
    }

    /**
     * Update sales plan
     */
    public function updateSalesPlan(Request $request, $id)
    {
        $plan = DB::table('planika_maloprodaja_sales_plans')->where('id', $id)->first();

        if (!$plan) {
            return response()->json(['message' => 'Sales plan not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'gross_salary' => 'nullable|numeric|min:0',
            'net_salary' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'planned_shoe_pairs' => 'nullable|integer|min:0',
            'planned_merchandise_pieces' => 'nullable|integer|min:0',
            'planned_revenue' => 'nullable|numeric|min:0',
            'revenue_currency' => 'nullable|string|max:10',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldValues = (array) $plan;
        $updateData = $validator->validated();
        $updateData['updated_by'] = $request->user()->id;
        $updateData['updated_at'] = now();

        DB::table('planika_maloprodaja_sales_plans')
            ->where('id', $id)
            ->update($updateData);

        $this->logAudit('updated', 'sales_plan', $id, $request->user()->id, $oldValues, $updateData, 'Sales plan updated');

        // Recalculate performance
        $this->recalculatePerformance($plan->employee_id, $plan->year, $plan->month);

        return $this->getSalesPlan($id);
    }

    /**
     * Delete sales plan
     */
    public function deleteSalesPlan(Request $request, $id)
    {
        $plan = DB::table('planika_maloprodaja_sales_plans')->where('id', $id)->first();

        if (!$plan) {
            return response()->json(['message' => 'Sales plan not found'], 404);
        }

        $oldValues = (array) $plan;

        DB::table('planika_maloprodaja_sales_plans')->where('id', $id)->delete();

        $this->logAudit('deleted', 'sales_plan', $id, $request->user()->id, $oldValues, null, 'Sales plan deleted');

        // Recalculate performance
        $this->recalculatePerformance($plan->employee_id, $plan->year, $plan->month);

        return response()->json(['message' => 'Sales plan deleted successfully']);
    }

    /**
     * Upload sales plans from Excel
     */
    public function uploadSalesPlans(Request $request)
    {
        // Check if user is admin
        $user = $request->user();
        $isAdmin = false;
        
        if (method_exists($user, 'hasAnyRole')) {
            try {
                $isAdmin = $user->hasAnyRole(['admin', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }
        
        // Check role from user table
        if (!$isAdmin && isset($user->role)) {
            $isAdmin = in_array(strtolower($user->role), ['admin', 'super-admin']);
        }

        if (!$isAdmin) {
            return response()->json(['error' => 'Samo administrator može učitati planove'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
            'overwrite' => 'nullable|boolean', // Whether to overwrite existing plans
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Povećaj execution time limit za velike Excel fajlove
            set_time_limit(300); // 5 minuta
            
            $file = $request->file('file');
            $overwrite = $request->boolean('overwrite', false);

            // Import Excel file
            $import = new SalesPlansImport($request->user()->id, $overwrite);
            Excel::import($import, $file);

            $results = [
                'success_count' => $import->getSuccessCount(),
                'error_count' => $import->getErrorCount(),
                'errors' => $import->getErrors(),
            ];

            if ($import->getErrorCount() > 0) {
                return response()->json($results, 207); // 207 Multi-Status
            }

            return response()->json($results, 200);
        } catch (\Exception $e) {
            Log::error('Sales plans upload error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'error' => 'Greška pri učitavanju Excel fajla',
                'message' => config('app.debug') ? $e->getMessage() : 'Greška na serveru. Pokušajte ponovo.'
            ], 500);
        }
    }

    // ==================== SALES RESULTS ====================

    /**
     * Get sales results
     */
    public function getSalesResults(Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $this->isAdmin($user);
            $userStoreId = $this->getUserStoreId($user);

            $query = DB::table('planika_maloprodaja_sales_results')
                ->leftJoin('hrm_employees', 'planika_maloprodaja_sales_results.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->leftJoin('hrm_stores', 'planika_maloprodaja_sales_results.store_id', '=', 'hrm_stores.id')
                ->select(
                    'planika_maloprodaja_sales_results.*',
                    'hrm_employees.employee_id as employee_number',
                    'users.name as employee_name',
                    'hrm_stores.name as store_name',
                    'hrm_stores.code as store_code'
                );

            // Filter by store if user is manager (not admin)
            if (!$isAdmin && $userStoreId) {
                $query->where('planika_maloprodaja_sales_results.store_id', $userStoreId);
            }

            if ($request->has('employee_id')) {
                $query->where('planika_maloprodaja_sales_results.employee_id', $request->input('employee_id'));
            }

            if ($request->has('year')) {
                $query->where('planika_maloprodaja_sales_results.year', $request->input('year'));
            }

            if ($request->has('month')) {
                $query->where('planika_maloprodaja_sales_results.month', $request->input('month'));
            }

            if ($request->has('store_id')) {
                $query->where('planika_maloprodaja_sales_results.store_id', $request->input('store_id'));
            }

            $results = $query->orderBy('planika_maloprodaja_sales_results.year', 'desc')
                ->orderBy('planika_maloprodaja_sales_results.month', 'desc')
                ->orderBy('planika_maloprodaja_sales_results.result_date', 'desc')
                ->orderBy('employee_name', 'asc')
                ->get();

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Error in getSalesResults: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju rezultata prodaje',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Upload sales results from Excel
     */
    public function uploadSalesResults(Request $request)
    {
        // Check if user is admin
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        if (!$isAdmin) {
            return response()->json(['error' => 'Samo administrator može učitati rezultate'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
            'store_id' => 'nullable|exists:hrm_stores,id',
            'overwrite' => 'nullable|boolean', // Whether to overwrite existing results
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            $storeId = $request->input('store_id');
            $overwrite = $request->boolean('overwrite', false);

            // Import Excel file
            $import = new SalesResultsImport($request->user()->id, $storeId, $overwrite);
            Excel::import($import, $file);

            $results = [
                'success_count' => $import->getSuccessCount(),
                'error_count' => $import->getErrorCount(),
                'errors' => $import->getErrors(),
            ];

            if ($import->getErrorCount() > 0) {
                return response()->json($results, 207); // 207 Multi-Status
            }

            return response()->json($results, 200);
        } catch (\Exception $e) {
            Log::error('Sales results upload error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Greška pri učitavanju Excel fajla: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Recalculate performance for employee/month
     */
    private function recalculatePerformance($employeeId, $year, $month)
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

    /**
     * Get sales performance (plan vs results)
     */
    public function getSalesPerformance(Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $this->isAdmin($user);
            $userStoreId = $this->getUserStoreId($user);

            $query = DB::table('planika_maloprodaja_sales_performance')
                ->leftJoin('hrm_employees', 'planika_maloprodaja_sales_performance.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->leftJoin('planika_maloprodaja_sales_results', function($join) {
                    $join->on('planika_maloprodaja_sales_performance.employee_id', '=', 'planika_maloprodaja_sales_results.employee_id')
                         ->on('planika_maloprodaja_sales_performance.year', '=', 'planika_maloprodaja_sales_results.year')
                         ->on('planika_maloprodaja_sales_performance.month', '=', 'planika_maloprodaja_sales_results.month');
                })
                ->leftJoin('hrm_stores', function($join) {
                    $join->on('planika_maloprodaja_sales_results.store_id', '=', 'hrm_stores.id')
                         ->orOn(function($q) {
                             $q->on('hrm_employees.store', '=', 'hrm_stores.name')
                               ->orOn('hrm_employees.store', '=', 'hrm_stores.code');
                         });
                })
                ->select(
                    'planika_maloprodaja_sales_performance.*',
                    'hrm_employees.employee_id as employee_number',
                    'users.name as employee_name',
                    'hrm_stores.id as store_id',
                    'hrm_stores.name as store_name',
                    'hrm_stores.code as store_code'
                );

            // Filter by store if user is manager (not admin)
            if (!$isAdmin && $userStoreId) {
                $query->where(function($q) use ($userStoreId) {
                    $q->where('hrm_stores.id', $userStoreId)
                      ->orWhere('planika_maloprodaja_sales_results.store_id', $userStoreId);
                });
            }

            if ($request->has('employee_id')) {
                $query->where('planika_maloprodaja_sales_performance.employee_id', $request->input('employee_id'));
            }

            if ($request->has('year')) {
                $query->where('planika_maloprodaja_sales_performance.year', $request->input('year'));
            }

            if ($request->has('month')) {
                $query->where('planika_maloprodaja_sales_performance.month', $request->input('month'));
            }

            if ($request->has('store_id')) {
                $query->where(function($q) use ($request) {
                    $q->where('hrm_stores.id', $request->input('store_id'))
                      ->orWhere('planika_maloprodaja_sales_results.store_id', $request->input('store_id'));
                });
            }

            $performance = $query->orderBy('planika_maloprodaja_sales_performance.year', 'desc')
                ->orderBy('planika_maloprodaja_sales_performance.month', 'desc')
                ->orderBy('planika_maloprodaja_sales_performance.shoe_pairs_percentage', 'desc')
                ->get();

            return response()->json($performance);
        } catch (\Exception $e) {
            Log::error('Error in getSalesPerformance: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju performansi prodaje',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}

