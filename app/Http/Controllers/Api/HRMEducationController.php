<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HRMEducationController extends Controller
{
    public function summary()
    {
        if (!Schema::hasTable('hrm_education_programs')) {
            return response()->json([
                'programs' => 0,
                'open_programs' => 0,
                'enrollments' => 0,
                'completed_enrollments' => 0,
                'certificates' => 0,
                'development_plans' => 0,
            ]);
        }

        return response()->json([
            'programs' => DB::table('hrm_education_programs')->count(),
            'open_programs' => DB::table('hrm_education_programs')->whereIn('status', ['open', 'in_progress'])->count(),
            'enrollments' => DB::table('hrm_education_enrollments')->count(),
            'completed_enrollments' => DB::table('hrm_education_enrollments')->where('status', 'completed')->count(),
            'certificates' => DB::table('hrm_education_certificates')->count(),
            'development_plans' => DB::table('hrm_development_plans')->where('status', 'active')->count(),
        ]);
    }

    public function programs(Request $request)
    {
        $query = DB::table('hrm_education_programs')
            ->select('hrm_education_programs.*')
            ->selectRaw('(SELECT COUNT(*) FROM hrm_education_enrollments e WHERE e.program_id = hrm_education_programs.id) as enrollments_count')
            ->orderByDesc('hrm_education_programs.created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('education_type')) {
            $query->where('education_type', $request->education_type);
        }
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('topic', 'like', $search)
                    ->orWhere('provider', 'like', $search);
            });
        }

        return response()->json($query->paginate((int) $request->get('per_page', 20)));
    }

    public function storeProgram(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'education_type' => 'required|in:internal,external,online,workshop',
            'topic' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'duration_hours' => 'nullable|integer|min:0',
            'cost' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'max_participants' => 'nullable|integer|min:1',
            'status' => 'nullable|in:draft,open,in_progress,completed,cancelled',
            'issues_certificate' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $id = DB::table('hrm_education_programs')->insertGetId(array_merge($data, [
            'status' => $data['status'] ?? 'draft',
            'currency' => $data['currency'] ?? 'BAM',
            'issues_certificate' => $data['issues_certificate'] ?? false,
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('hrm_education_programs')->find($id), 201);
    }

    public function updateProgram(Request $request, $id)
    {
        $program = DB::table('hrm_education_programs')->find($id);
        if (!$program) {
            return response()->json(['message' => 'Program nije pronađen.'], 404);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'education_type' => 'sometimes|in:internal,external,online,workshop',
            'topic' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'duration_hours' => 'nullable|integer|min:0',
            'cost' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'max_participants' => 'nullable|integer|min:1',
            'status' => 'sometimes|in:draft,open,in_progress,completed,cancelled',
            'issues_certificate' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        DB::table('hrm_education_programs')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('hrm_education_programs')->find($id));
    }

    public function deleteProgram($id)
    {
        $deleted = DB::table('hrm_education_programs')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Program nije pronađen.'], 404);
        }

        return response()->json(['message' => 'Program obrisan.']);
    }

    public function enrollments(Request $request)
    {
        $query = DB::table('hrm_education_enrollments')
            ->select(
                'hrm_education_enrollments.*',
                'hrm_education_programs.title as program_title',
                'hrm_education_programs.education_type',
                'users.name as employee_name'
            )
            ->leftJoin('hrm_education_programs', 'hrm_education_enrollments.program_id', '=', 'hrm_education_programs.id')
            ->leftJoin('hrm_employees', 'hrm_education_enrollments.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->orderByDesc('hrm_education_enrollments.created_at');

        if ($request->filled('status')) {
            $query->where('hrm_education_enrollments.status', $request->status);
        }
        if ($request->filled('program_id')) {
            $query->where('hrm_education_enrollments.program_id', $request->program_id);
        }
        if ($request->filled('employee_id')) {
            $query->where('hrm_education_enrollments.employee_id', $request->employee_id);
        }
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', $search)
                    ->orWhere('hrm_education_programs.title', 'like', $search);
            });
        }

        return response()->json($query->paginate((int) $request->get('per_page', 20)));
    }

    public function storeEnrollment(Request $request)
    {
        $data = $request->validate([
            'program_id' => 'required|exists:hrm_education_programs,id',
            'employee_id' => 'required|exists:hrm_employees,id',
            'status' => 'nullable|in:planned,in_progress,completed,cancelled,no_show',
            'enrolled_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $exists = DB::table('hrm_education_enrollments')
            ->where('program_id', $data['program_id'])
            ->where('employee_id', $data['employee_id'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Zaposlenik je već prijavljen na ovaj program.'], 422);
        }

        $id = DB::table('hrm_education_enrollments')->insertGetId([
            'program_id' => $data['program_id'],
            'employee_id' => $data['employee_id'],
            'status' => $data['status'] ?? 'planned',
            'enrolled_at' => $data['enrolled_at'] ?? now()->toDateString(),
            'notes' => $data['notes'] ?? null,
            'enrolled_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->enrollmentPayload($id), 201);
    }

    public function updateEnrollment(Request $request, $id)
    {
        $enrollment = DB::table('hrm_education_enrollments')->find($id);
        if (!$enrollment) {
            return response()->json(['message' => 'Prijava nije pronađena.'], 404);
        }

        $data = $request->validate([
            'status' => 'sometimes|in:planned,in_progress,completed,cancelled,no_show',
            'completed_at' => 'nullable|date',
            'rating' => 'nullable|integer|min:1|max:5',
            'feedback' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (($data['status'] ?? null) === 'completed' && empty($data['completed_at'])) {
            $data['completed_at'] = now()->toDateString();
        }

        DB::table('hrm_education_enrollments')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        $updated = DB::table('hrm_education_enrollments')->find($id);

        if ($updated->status === 'completed') {
            $program = DB::table('hrm_education_programs')->find($updated->program_id);
            if ($program && $program->issues_certificate) {
                $hasCert = DB::table('hrm_education_certificates')
                    ->where('enrollment_id', $id)
                    ->exists();
                if (!$hasCert) {
                    DB::table('hrm_education_certificates')->insert([
                        'employee_id' => $updated->employee_id,
                        'program_id' => $updated->program_id,
                        'enrollment_id' => $id,
                        'title' => $program->title,
                        'issuer' => $program->provider ?: 'Planika HR',
                        'issued_at' => $updated->completed_at ?? now()->toDateString(),
                        'created_by' => $request->user()?->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        return response()->json($this->enrollmentPayload($id));
    }

    public function certificates(Request $request)
    {
        $query = DB::table('hrm_education_certificates')
            ->select(
                'hrm_education_certificates.*',
                'users.name as employee_name',
                'hrm_education_programs.title as program_title'
            )
            ->leftJoin('hrm_employees', 'hrm_education_certificates.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_education_programs', 'hrm_education_certificates.program_id', '=', 'hrm_education_programs.id')
            ->orderByDesc('hrm_education_certificates.issued_at');

        if ($request->filled('employee_id')) {
            $query->where('hrm_education_certificates.employee_id', $request->employee_id);
        }
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('hrm_education_certificates.title', 'like', $search)
                    ->orWhere('users.name', 'like', $search)
                    ->orWhere('hrm_education_certificates.certificate_number', 'like', $search);
            });
        }

        return response()->json($query->paginate((int) $request->get('per_page', 20)));
    }

    public function storeCertificate(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:hrm_employees,id',
            'program_id' => 'nullable|exists:hrm_education_programs,id',
            'title' => 'required|string|max:255',
            'issuer' => 'nullable|string|max:255',
            'certificate_number' => 'nullable|string|max:100',
            'issued_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:issued_at',
            'notes' => 'nullable|string',
        ]);

        $id = DB::table('hrm_education_certificates')->insertGetId(array_merge($data, [
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('hrm_education_certificates')->find($id), 201);
    }

    public function deleteCertificate($id)
    {
        $deleted = DB::table('hrm_education_certificates')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Certifikat nije pronađen.'], 404);
        }

        return response()->json(['message' => 'Certifikat obrisan.']);
    }

    public function developmentPlans(Request $request)
    {
        $query = DB::table('hrm_development_plans')
            ->select(
                'hrm_development_plans.*',
                'users.name as employee_name',
                'mentor_users.name as mentor_name'
            )
            ->leftJoin('hrm_employees', 'hrm_development_plans.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_employees as mentors', 'hrm_development_plans.mentor_id', '=', 'mentors.id')
            ->leftJoin('users as mentor_users', 'mentors.user_id', '=', 'mentor_users.id')
            ->orderByDesc('hrm_development_plans.created_at');

        if ($request->filled('status')) {
            $query->where('hrm_development_plans.status', $request->status);
        }
        if ($request->filled('employee_id')) {
            $query->where('hrm_development_plans.employee_id', $request->employee_id);
        }

        return response()->json($query->paginate((int) $request->get('per_page', 20)));
    }

    public function storeDevelopmentPlan(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:hrm_employees,id',
            'title' => 'required|string|max:255',
            'goals' => 'nullable|string',
            'activities' => 'nullable|array',
            'start_date' => 'nullable|date',
            'target_date' => 'nullable|date',
            'status' => 'nullable|in:draft,active,completed,cancelled',
            'progress_percent' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'mentor_id' => 'nullable|exists:hrm_employees,id',
        ]);

        $id = DB::table('hrm_development_plans')->insertGetId([
            'employee_id' => $data['employee_id'],
            'title' => $data['title'],
            'goals' => $data['goals'] ?? null,
            'activities' => isset($data['activities']) ? json_encode($data['activities']) : null,
            'start_date' => $data['start_date'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'status' => $data['status'] ?? 'active',
            'progress_percent' => $data['progress_percent'] ?? 0,
            'notes' => $data['notes'] ?? null,
            'mentor_id' => $data['mentor_id'] ?? null,
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->developmentPlanPayload($id), 201);
    }

    public function updateDevelopmentPlan(Request $request, $id)
    {
        $plan = DB::table('hrm_development_plans')->find($id);
        if (!$plan) {
            return response()->json(['message' => 'Plan razvoja nije pronađen.'], 404);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'goals' => 'nullable|string',
            'activities' => 'nullable|array',
            'start_date' => 'nullable|date',
            'target_date' => 'nullable|date',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
            'progress_percent' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'mentor_id' => 'nullable|exists:hrm_employees,id',
        ]);

        if (array_key_exists('activities', $data)) {
            $data['activities'] = $data['activities'] !== null ? json_encode($data['activities']) : null;
        }

        DB::table('hrm_development_plans')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        return response()->json($this->developmentPlanPayload($id));
    }

    public function deleteDevelopmentPlan($id)
    {
        $deleted = DB::table('hrm_development_plans')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Plan razvoja nije pronađen.'], 404);
        }

        return response()->json(['message' => 'Plan razvoja obrisan.']);
    }

    private function enrollmentPayload(int $id): object
    {
        return DB::table('hrm_education_enrollments')
            ->select(
                'hrm_education_enrollments.*',
                'hrm_education_programs.title as program_title',
                'users.name as employee_name'
            )
            ->leftJoin('hrm_education_programs', 'hrm_education_enrollments.program_id', '=', 'hrm_education_programs.id')
            ->leftJoin('hrm_employees', 'hrm_education_enrollments.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where('hrm_education_enrollments.id', $id)
            ->first();
    }

    private function developmentPlanPayload(int $id): object
    {
        $plan = DB::table('hrm_development_plans')
            ->select(
                'hrm_development_plans.*',
                'users.name as employee_name',
                'mentor_users.name as mentor_name'
            )
            ->leftJoin('hrm_employees', 'hrm_development_plans.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_employees as mentors', 'hrm_development_plans.mentor_id', '=', 'mentors.id')
            ->leftJoin('users as mentor_users', 'mentors.user_id', '=', 'mentor_users.id')
            ->where('hrm_development_plans.id', $id)
            ->first();

        if ($plan && is_string($plan->activities)) {
            $plan->activities = json_decode($plan->activities, true);
        }

        return $plan;
    }
}
