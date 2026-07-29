<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HRMTalentController extends Controller
{
    public function summary()
    {
        if (!Schema::hasTable('hrm_talent_profiles')) {
            return response()->json([
                'talent_pool' => 0,
                'high_potential' => 0,
                'career_paths' => 0,
                'succession_plans' => 0,
                'nine_box' => [],
            ]);
        }

        $nineBox = DB::table('hrm_talent_profiles')
            ->select('performance_level', 'potential_level', DB::raw('count(*) as total'))
            ->where('in_talent_pool', true)
            ->groupBy('performance_level', 'potential_level')
            ->get();

        return response()->json([
            'talent_pool' => DB::table('hrm_talent_profiles')->where('in_talent_pool', true)->count(),
            'high_potential' => DB::table('hrm_talent_profiles')
                ->where('potential_level', 'high')
                ->where('in_talent_pool', true)
                ->count(),
            'career_paths' => DB::table('hrm_career_paths')->where('status', 'active')->count(),
            'succession_plans' => DB::table('hrm_succession_plans')->where('status', 'active')->count(),
            'nine_box' => $nineBox,
        ]);
    }

    public function profiles(Request $request)
    {
        $query = DB::table('hrm_talent_profiles')
            ->select(
                'hrm_talent_profiles.*',
                'users.name as employee_name',
                'hrm_employees.position as employee_position',
                'hrm_departments.name as department_name'
            )
            ->leftJoin('hrm_employees', 'hrm_talent_profiles.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->orderByDesc('hrm_talent_profiles.updated_at');

        if ($request->boolean('in_talent_pool', false) || $request->get('in_talent_pool') === '1') {
            $query->where('hrm_talent_profiles.in_talent_pool', true);
        }
        if ($request->filled('performance_level')) {
            $query->where('hrm_talent_profiles.performance_level', $request->performance_level);
        }
        if ($request->filled('potential_level')) {
            $query->where('hrm_talent_profiles.potential_level', $request->potential_level);
        }
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', $search)
                    ->orWhere('hrm_employees.position', 'like', $search);
            });
        }

        $paginator = $query->paginate((int) $request->get('per_page', 50));
        $paginator->getCollection()->transform(function ($row) {
            return $this->decodeJsonFields($row);
        });

        return response()->json($paginator);
    }

    public function storeProfile(Request $request)
    {
        $data = $this->validateProfile($request);

        $exists = DB::table('hrm_talent_profiles')->where('employee_id', $data['employee_id'])->exists();
        if ($exists) {
            return response()->json(['message' => 'Profil talenta za ovog zaposlenika već postoji.'], 422);
        }

        $id = DB::table('hrm_talent_profiles')->insertGetId($this->profileInsertPayload($data, $request->user()?->id));

        return response()->json($this->profilePayload($id), 201);
    }

    public function updateProfile(Request $request, $id)
    {
        $profile = DB::table('hrm_talent_profiles')->find($id);
        if (!$profile) {
            return response()->json(['message' => 'Profil talenta nije pronađen.'], 404);
        }

        $data = $this->validateProfile($request, true);
        unset($data['employee_id']);

        if (array_key_exists('competencies', $data)) {
            $data['competencies'] = $data['competencies'] !== null ? json_encode($data['competencies']) : null;
        }
        if (array_key_exists('development_activities', $data)) {
            $data['development_activities'] = $data['development_activities'] !== null
                ? json_encode($data['development_activities'])
                : null;
        }

        DB::table('hrm_talent_profiles')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        return response()->json($this->profilePayload($id));
    }

    public function deleteProfile($id)
    {
        $deleted = DB::table('hrm_talent_profiles')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Profil talenta nije pronađen.'], 404);
        }

        return response()->json(['message' => 'Profil talenta obrisan.']);
    }

    public function careerPaths(Request $request)
    {
        $query = DB::table('hrm_career_paths')
            ->select(
                'hrm_career_paths.*',
                'users.name as employee_name',
                'hrm_work_positions.name as target_work_position_name'
            )
            ->leftJoin('hrm_employees', 'hrm_career_paths.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_work_positions', 'hrm_career_paths.target_work_position_id', '=', 'hrm_work_positions.id')
            ->orderByDesc('hrm_career_paths.created_at');

        if ($request->filled('status')) {
            $query->where('hrm_career_paths.status', $request->status);
        }
        if ($request->filled('employee_id')) {
            $query->where('hrm_career_paths.employee_id', $request->employee_id);
        }

        $paginator = $query->paginate((int) $request->get('per_page', 20));
        $paginator->getCollection()->transform(function ($row) {
            if (is_string($row->milestones ?? null)) {
                $row->milestones = json_decode($row->milestones, true);
            }
            return $row;
        });

        return response()->json($paginator);
    }

    public function storeCareerPath(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:hrm_employees,id',
            'current_position' => 'nullable|string|max:255',
            'target_position' => 'nullable|string|max:255',
            'target_work_position_id' => 'nullable|exists:hrm_work_positions,id',
            'horizon' => 'nullable|in:short,medium,long',
            'status' => 'nullable|in:draft,active,achieved,cancelled',
            'milestones' => 'nullable|array',
            'notes' => 'nullable|string',
            'target_date' => 'nullable|date',
        ]);

        $id = DB::table('hrm_career_paths')->insertGetId([
            'employee_id' => $data['employee_id'],
            'current_position' => $data['current_position'] ?? null,
            'target_position' => $data['target_position'] ?? null,
            'target_work_position_id' => $data['target_work_position_id'] ?? null,
            'horizon' => $data['horizon'] ?? 'medium',
            'status' => $data['status'] ?? 'active',
            'milestones' => isset($data['milestones']) ? json_encode($data['milestones']) : null,
            'notes' => $data['notes'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->careerPathPayload($id), 201);
    }

    public function updateCareerPath(Request $request, $id)
    {
        $path = DB::table('hrm_career_paths')->find($id);
        if (!$path) {
            return response()->json(['message' => 'Karijerna putanja nije pronađena.'], 404);
        }

        $data = $request->validate([
            'current_position' => 'nullable|string|max:255',
            'target_position' => 'nullable|string|max:255',
            'target_work_position_id' => 'nullable|exists:hrm_work_positions,id',
            'horizon' => 'nullable|in:short,medium,long',
            'status' => 'sometimes|in:draft,active,achieved,cancelled',
            'milestones' => 'nullable|array',
            'notes' => 'nullable|string',
            'target_date' => 'nullable|date',
        ]);

        if (array_key_exists('milestones', $data)) {
            $data['milestones'] = $data['milestones'] !== null ? json_encode($data['milestones']) : null;
        }

        DB::table('hrm_career_paths')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        return response()->json($this->careerPathPayload($id));
    }

    public function deleteCareerPath($id)
    {
        $deleted = DB::table('hrm_career_paths')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Karijerna putanja nije pronađena.'], 404);
        }

        return response()->json(['message' => 'Karijerna putanja obrisana.']);
    }

    public function successionPlans(Request $request)
    {
        $query = DB::table('hrm_succession_plans')
            ->select(
                'hrm_succession_plans.*',
                'incumbent.name as incumbent_name',
                'successor.name as successor_name',
                'hrm_work_positions.name as work_position_name'
            )
            ->leftJoin('hrm_employees as inc_emp', 'hrm_succession_plans.incumbent_employee_id', '=', 'inc_emp.id')
            ->leftJoin('users as incumbent', 'inc_emp.user_id', '=', 'incumbent.id')
            ->leftJoin('hrm_employees as succ_emp', 'hrm_succession_plans.successor_employee_id', '=', 'succ_emp.id')
            ->leftJoin('users as successor', 'succ_emp.user_id', '=', 'successor.id')
            ->leftJoin('hrm_work_positions', 'hrm_succession_plans.work_position_id', '=', 'hrm_work_positions.id')
            ->orderBy('hrm_succession_plans.priority')
            ->orderByDesc('hrm_succession_plans.created_at');

        if ($request->filled('status')) {
            $query->where('hrm_succession_plans.status', $request->status);
        }
        if ($request->filled('readiness')) {
            $query->where('hrm_succession_plans.readiness', $request->readiness);
        }

        return response()->json($query->paginate((int) $request->get('per_page', 20)));
    }

    public function storeSuccessionPlan(Request $request)
    {
        $data = $request->validate([
            'position_title' => 'required|string|max:255',
            'work_position_id' => 'nullable|exists:hrm_work_positions,id',
            'incumbent_employee_id' => 'nullable|exists:hrm_employees,id',
            'successor_employee_id' => 'required|exists:hrm_employees,id',
            'readiness' => 'nullable|in:ready_now,1_2_years,3_plus_years',
            'priority' => 'nullable|integer|min:1|max:3',
            'status' => 'nullable|in:active,completed,cancelled',
            'development_actions' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $id = DB::table('hrm_succession_plans')->insertGetId(array_merge($data, [
            'readiness' => $data['readiness'] ?? '1_2_years',
            'priority' => $data['priority'] ?? 2,
            'status' => $data['status'] ?? 'active',
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json($this->successionPayload($id), 201);
    }

    public function updateSuccessionPlan(Request $request, $id)
    {
        $plan = DB::table('hrm_succession_plans')->find($id);
        if (!$plan) {
            return response()->json(['message' => 'Plan nasljeđivanja nije pronađen.'], 404);
        }

        $data = $request->validate([
            'position_title' => 'sometimes|string|max:255',
            'work_position_id' => 'nullable|exists:hrm_work_positions,id',
            'incumbent_employee_id' => 'nullable|exists:hrm_employees,id',
            'successor_employee_id' => 'sometimes|exists:hrm_employees,id',
            'readiness' => 'sometimes|in:ready_now,1_2_years,3_plus_years',
            'priority' => 'nullable|integer|min:1|max:3',
            'status' => 'sometimes|in:active,completed,cancelled',
            'development_actions' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::table('hrm_succession_plans')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        return response()->json($this->successionPayload($id));
    }

    public function deleteSuccessionPlan($id)
    {
        $deleted = DB::table('hrm_succession_plans')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Plan nasljeđivanja nije pronađen.'], 404);
        }

        return response()->json(['message' => 'Plan nasljeđivanja obrisan.']);
    }

    private function validateProfile(Request $request, bool $partial = false): array
    {
        $rules = [
            'employee_id' => ($partial ? 'sometimes' : 'required') . '|exists:hrm_employees,id',
            'performance_level' => ($partial ? 'sometimes' : 'required') . '|in:low,medium,high',
            'potential_level' => ($partial ? 'sometimes' : 'required') . '|in:low,medium,high',
            'in_talent_pool' => 'nullable|boolean',
            'readiness' => 'nullable|in:ready_now,1_2_years,3_plus_years',
            'competencies' => 'nullable|array',
            'development_activities' => 'nullable|array',
            'strengths' => 'nullable|string',
            'development_areas' => 'nullable|string',
            'goals' => 'nullable|string',
            'review_date' => 'nullable|date',
            'next_review_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];

        return $request->validate($rules);
    }

    private function profileInsertPayload(array $data, ?int $userId): array
    {
        return [
            'employee_id' => $data['employee_id'],
            'performance_level' => $data['performance_level'],
            'potential_level' => $data['potential_level'],
            'in_talent_pool' => $data['in_talent_pool'] ?? true,
            'readiness' => $data['readiness'] ?? null,
            'competencies' => isset($data['competencies']) ? json_encode($data['competencies']) : null,
            'development_activities' => isset($data['development_activities'])
                ? json_encode($data['development_activities'])
                : null,
            'strengths' => $data['strengths'] ?? null,
            'development_areas' => $data['development_areas'] ?? null,
            'goals' => $data['goals'] ?? null,
            'review_date' => $data['review_date'] ?? null,
            'next_review_date' => $data['next_review_date'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function decodeJsonFields(object $row): object
    {
        foreach (['competencies', 'development_activities'] as $field) {
            if (isset($row->$field) && is_string($row->$field)) {
                $row->$field = json_decode($row->$field, true);
            }
        }

        return $row;
    }

    private function profilePayload(int $id): object
    {
        $row = DB::table('hrm_talent_profiles')
            ->select(
                'hrm_talent_profiles.*',
                'users.name as employee_name',
                'hrm_employees.position as employee_position',
                'hrm_departments.name as department_name'
            )
            ->leftJoin('hrm_employees', 'hrm_talent_profiles.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_departments', 'hrm_employees.department_id', '=', 'hrm_departments.id')
            ->where('hrm_talent_profiles.id', $id)
            ->first();

        return $this->decodeJsonFields($row);
    }

    private function careerPathPayload(int $id): object
    {
        $row = DB::table('hrm_career_paths')
            ->select(
                'hrm_career_paths.*',
                'users.name as employee_name',
                'hrm_work_positions.name as target_work_position_name'
            )
            ->leftJoin('hrm_employees', 'hrm_career_paths.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_work_positions', 'hrm_career_paths.target_work_position_id', '=', 'hrm_work_positions.id')
            ->where('hrm_career_paths.id', $id)
            ->first();

        if ($row && is_string($row->milestones ?? null)) {
            $row->milestones = json_decode($row->milestones, true);
        }

        return $row;
    }

    private function successionPayload(int $id): object
    {
        return DB::table('hrm_succession_plans')
            ->select(
                'hrm_succession_plans.*',
                'incumbent.name as incumbent_name',
                'successor.name as successor_name',
                'hrm_work_positions.name as work_position_name'
            )
            ->leftJoin('hrm_employees as inc_emp', 'hrm_succession_plans.incumbent_employee_id', '=', 'inc_emp.id')
            ->leftJoin('users as incumbent', 'inc_emp.user_id', '=', 'incumbent.id')
            ->leftJoin('hrm_employees as succ_emp', 'hrm_succession_plans.successor_employee_id', '=', 'succ_emp.id')
            ->leftJoin('users as successor', 'succ_emp.user_id', '=', 'successor.id')
            ->leftJoin('hrm_work_positions', 'hrm_succession_plans.work_position_id', '=', 'hrm_work_positions.id')
            ->where('hrm_succession_plans.id', $id)
            ->first();
    }
}
