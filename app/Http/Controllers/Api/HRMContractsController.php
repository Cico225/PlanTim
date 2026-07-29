<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HRM\ContractDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class HRMContractsController extends Controller
{
    public function __construct(
        private readonly ContractDocumentService $documentService
    ) {
    }

    public function templates()
    {
        $templates = DB::table('hrm_contract_templates')
            ->where('is_active', true)
            ->orderBy('legal_entity')
            ->orderBy('job_role')
            ->get();

        return response()->json($templates);
    }

    public function settings()
    {
        $settings = DB::table('hrm_contract_settings')->first();

        if (!$settings) {
            return response()->json([
                'default_renewal_notice_days' => 30,
                'auto_create_renewal_draft' => true,
            ]);
        }

        return response()->json($settings);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'default_renewal_notice_days' => 'required|integer|min:1|max:365',
            'auto_create_renewal_draft' => 'required|boolean',
        ]);

        $existing = DB::table('hrm_contract_settings')->first();

        if ($existing) {
            DB::table('hrm_contract_settings')->where('id', $existing->id)->update(array_merge($data, [
                'updated_at' => now(),
            ]));
        } else {
            DB::table('hrm_contract_settings')->insert(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        return $this->settings();
    }

    public function summary()
    {
        $today = now()->toDateString();
        $noticeDate = now()->addDays(
            (int) (DB::table('hrm_contract_settings')->value('default_renewal_notice_days') ?? 30)
        )->toDateString();

        return response()->json([
            'total' => DB::table('hrm_employment_contracts')->count(),
            'active' => DB::table('hrm_employment_contracts')->where('status', 'active')->count(),
            'expiring_soon' => DB::table('hrm_employment_contracts')
                ->where('status', 'active')
                ->whereNotNull('expiry_date')
                ->whereBetween('expiry_date', [$today, $noticeDate])
                ->count(),
            'draft' => DB::table('hrm_employment_contracts')->where('status', 'draft')->count(),
            'by_entity' => DB::table('hrm_employment_contracts')
                ->select('legal_entity', DB::raw('count(*) as total'))
                ->groupBy('legal_entity')
                ->get(),
        ]);
    }

    public function index(Request $request)
    {
        $query = DB::table('hrm_employment_contracts')
            ->select(
                'hrm_employment_contracts.*',
                'users.name as employee_user_name',
                'hrm_stores.name as store_label',
                'hrm_contract_templates.name as template_name'
            )
            ->leftJoin('hrm_employees', 'hrm_employment_contracts.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_stores', 'hrm_employment_contracts.store_id', '=', 'hrm_stores.id')
            ->leftJoin('hrm_contract_templates', 'hrm_employment_contracts.template_id', '=', 'hrm_contract_templates.id')
            ->orderByDesc('hrm_employment_contracts.created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('hrm_employment_contracts.employee_full_name', 'like', "%{$search}%")
                    ->orWhere('hrm_employment_contracts.contract_number', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%")
                    ->orWhere('hrm_stores.name', 'like', "%{$search}%");
            });
        }

        foreach (['store_id', 'legal_entity', 'job_role', 'status', 'employee_id', 'template_id'] as $field) {
            if ($request->filled($field)) {
                $query->where('hrm_employment_contracts.' . $field, $request->input($field));
            }
        }

        if ($request->filled('expiring_within_days')) {
            $days = (int) $request->input('expiring_within_days');
            $query->where('hrm_employment_contracts.status', 'active')
                ->whereNotNull('hrm_employment_contracts.expiry_date')
                ->whereDate('hrm_employment_contracts.expiry_date', '<=', now()->addDays($days)->toDateString());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('hrm_employment_contracts.work_start_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('hrm_employment_contracts.expiry_date', '<=', $request->input('date_to'));
        }

        return response()->json($query->paginate(min((int) $request->input('per_page', 20), 100)));
    }

    public function show($id)
    {
        $contract = $this->findContract($id);
        if (!$contract) {
            return response()->json(['message' => 'Ugovor nije pronađen.'], 404);
        }

        $renewals = DB::table('hrm_contract_renewals')
            ->where('source_contract_id', $id)
            ->orWhere('new_contract_id', $id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'contract' => $contract,
            'renewals' => $renewals,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateContract($request);
        $employee = $this->loadEmployeeContext($data['employee_id']);

        if (!$employee) {
            return response()->json(['message' => 'Zaposlenik nije pronađen.'], 404);
        }

        $template = DB::table('hrm_contract_templates')->where('id', $data['template_id'])->first();
        if (!$template) {
            return response()->json(['message' => 'Šablon ugovora nije pronađen.'], 404);
        }

        $settings = DB::table('hrm_contract_settings')->first();
        $payload = $this->buildContractPayload($data, $employee, $template, $request->user()?->id, $settings);

        $id = DB::table('hrm_employment_contracts')->insertGetId($payload);

        if ($request->boolean('generate_document')) {
            $this->generateDocumentInternal($id, $request->user()?->id);
        }

        return response()->json($this->findContract($id), 201);
    }

    public function update(Request $request, $id)
    {
        $contract = DB::table('hrm_employment_contracts')->where('id', $id)->first();
        if (!$contract) {
            return response()->json(['message' => 'Ugovor nije pronađen.'], 404);
        }

        $data = $this->validateContract($request, true);
        $payload = collect($data)->only([
            'store_id', 'contract_number', 'protocol_number', 'status', 'employment_term',
            'contract_sign_date', 'work_start_date', 'work_end_date', 'effective_date', 'expiry_date',
            'auto_renew', 'renewal_notice_days', 'salary_gross', 'salary_net', 'currency',
            'position_title', 'store_name', 'store_city', 'employee_full_name', 'employee_origin',
            'employee_address', 'employee_education', 'notes', 'annex_number',
        ])->filter(fn ($value) => $value !== null)->all();

        if ($request->has('custom_fields')) {
            $payload['custom_fields'] = json_encode($request->input('custom_fields'));
        }

        $payload['updated_by'] = $request->user()?->id;
        $payload['updated_at'] = now();

        DB::table('hrm_employment_contracts')->where('id', $id)->update($payload);

        if ($request->boolean('generate_document')) {
            $this->generateDocumentInternal($id, $request->user()?->id);
        }

        return response()->json($this->findContract($id));
    }

    public function renew(Request $request, $id)
    {
        $source = DB::table('hrm_employment_contracts')->where('id', $id)->first();
        if (!$source) {
            return response()->json(['message' => 'Izvorni ugovor nije pronađen.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'renewal_end_date' => 'required|date|after_or_equal:today',
            'contract_sign_date' => 'nullable|date',
            'effective_date' => 'nullable|date',
            'salary_gross' => 'nullable|numeric|min:0',
            'salary_net' => 'nullable|numeric|min:0',
            'protocol_number' => 'nullable|string|max:80',
            'notes' => 'nullable|string',
            'generate_document' => 'nullable|boolean',
            'custom_fields' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $template = DB::table('hrm_contract_templates')->where('id', $source->template_id)->first();
        $nextAnnex = ((int) ($source->annex_number ?? 0)) + 1;

        $newContract = (array) $source;
        unset($newContract['id'], $newContract['generated_document_path'], $newContract['created_at'], $newContract['updated_at']);
        $newContract['parent_contract_id'] = $source->id;
        $newContract['status'] = 'draft';
        $newContract['contract_sign_date'] = $request->input('contract_sign_date', now()->toDateString());
        $newContract['effective_date'] = $request->input('effective_date', $request->input('renewal_end_date'));
        $newContract['work_end_date'] = $request->input('renewal_end_date');
        $newContract['expiry_date'] = $request->input('renewal_end_date');
        $newContract['salary_gross'] = $request->input('salary_gross', $source->salary_gross);
        $newContract['salary_net'] = $request->input('salary_net', $source->salary_net);
        $newContract['protocol_number'] = $request->input('protocol_number', $source->protocol_number);
        $newContract['notes'] = $request->input('notes', $source->notes);
        $newContract['annex_number'] = $template->document_kind === 'annex' ? $nextAnnex : null;
        $newContract['document_kind'] = $template->document_kind;
        $newContract['created_by'] = $request->user()?->id;
        $newContract['updated_by'] = $request->user()?->id;
        $newContract['created_at'] = now();
        $newContract['updated_at'] = now();

        if ($request->has('custom_fields')) {
            $existingCustom = json_decode($source->custom_fields ?? '{}', true) ?: [];
            $newContract['custom_fields'] = json_encode(array_merge($existingCustom, $request->input('custom_fields', [])));
        }

        $newId = DB::table('hrm_employment_contracts')->insertGetId($newContract);

        DB::table('hrm_contract_renewals')->insert([
            'source_contract_id' => $source->id,
            'new_contract_id' => $newId,
            'renewal_end_date' => $request->input('renewal_end_date'),
            'notes' => $request->input('notes'),
            'renewed_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('hrm_employment_contracts')->where('id', $source->id)->update([
            'status' => 'superseded',
            'updated_at' => now(),
        ]);

        if ($request->boolean('generate_document', true)) {
            $this->generateDocumentInternal($newId, $request->user()?->id);
        }

        return response()->json($this->findContract($newId), 201);
    }

    public function generateDocument(Request $request, $id)
    {
        $contract = $this->generateDocumentInternal($id, $request->user()?->id);
        if (!$contract) {
            return response()->json(['message' => 'Ugovor nije pronađen.'], 404);
        }

        return response()->json($contract);
    }

    public function downloadDocument($id)
    {
        $contract = DB::table('hrm_employment_contracts')->where('id', $id)->first();
        if (!$contract || !$contract->generated_document_path) {
            return response()->json(['message' => 'Generisani dokument nije dostupan.'], 404);
        }

        if (!Storage::disk('local')->exists($contract->generated_document_path)) {
            return response()->json(['message' => 'Datoteka dokumenta ne postoji.'], 404);
        }

        return Storage::disk('local')->download(
            $contract->generated_document_path,
            basename($contract->generated_document_path)
        );
    }

    private function generateDocumentInternal(int $id, ?int $userId): ?object
    {
        $contract = DB::table('hrm_employment_contracts')->where('id', $id)->first();
        if (!$contract) {
            return null;
        }

        $template = DB::table('hrm_contract_templates')->where('id', $contract->template_id)->first();
        if (!$template) {
            return null;
        }

        $parent = $contract->parent_contract_id
            ? DB::table('hrm_employment_contracts')->where('id', $contract->parent_contract_id)->first()
            : null;

        $path = $this->documentService->generate($contract, $template, $parent);

        DB::table('hrm_employment_contracts')->where('id', $id)->update([
            'generated_document_path' => $path,
            'updated_by' => $userId,
            'updated_at' => now(),
        ]);

        return $this->findContract($id);
    }

    private function validateContract(Request $request, bool $partial = false): array
    {
        $rules = [
            'employee_id' => ($partial ? 'sometimes|' : '') . 'required|exists:hrm_employees,id',
            'template_id' => ($partial ? 'sometimes|' : '') . 'required|exists:hrm_contract_templates,id',
            'store_id' => 'nullable|exists:hrm_stores,id',
            'contract_number' => 'nullable|string|max:80',
            'protocol_number' => 'nullable|string|max:80',
            'status' => 'nullable|in:draft,active,expired,terminated,superseded',
            'employment_term' => 'nullable|in:indefinite,fixed',
            'contract_sign_date' => 'nullable|date',
            'work_start_date' => 'nullable|date',
            'work_end_date' => 'nullable|date|after_or_equal:work_start_date',
            'effective_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'auto_renew' => 'nullable|boolean',
            'renewal_notice_days' => 'nullable|integer|min:1|max:365',
            'salary_gross' => 'nullable|numeric|min:0',
            'salary_net' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'position_title' => 'nullable|string|max:255',
            'store_name' => 'nullable|string|max:255',
            'store_city' => 'nullable|string|max:255',
            'employee_full_name' => 'nullable|string|max:255',
            'employee_origin' => 'nullable|string|max:255',
            'employee_address' => 'nullable|string|max:255',
            'employee_education' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
            'generate_document' => 'nullable|boolean',
        ];

        return $request->validate($rules);
    }

    private function buildContractPayload(array $data, object $employee, object $template, ?int $userId, ?object $settings): array
    {
        $store = !empty($data['store_id'])
            ? DB::table('hrm_stores')->where('id', $data['store_id'])->first()
            : null;

        return [
            'employee_id' => $data['employee_id'],
            'store_id' => $data['store_id'] ?? null,
            'template_id' => $data['template_id'],
            'parent_contract_id' => null,
            'contract_number' => $data['contract_number'] ?? null,
            'protocol_number' => $data['protocol_number'] ?? null,
            'legal_entity' => $template->legal_entity,
            'job_role' => $template->job_role,
            'document_kind' => $template->document_kind,
            'annex_number' => $template->document_kind === 'annex' ? 1 : null,
            'status' => $data['status'] ?? 'draft',
            'employment_term' => $data['employment_term'] ?? 'indefinite',
            'contract_sign_date' => $data['contract_sign_date'] ?? now()->toDateString(),
            'work_start_date' => $data['work_start_date'] ?? now()->toDateString(),
            'work_end_date' => $data['work_end_date'] ?? null,
            'effective_date' => $data['effective_date'] ?? ($data['work_start_date'] ?? now()->toDateString()),
            'expiry_date' => $data['expiry_date'] ?? $data['work_end_date'] ?? null,
            'auto_renew' => array_key_exists('auto_renew', $data) ? (bool) $data['auto_renew'] : true,
            'renewal_notice_days' => $data['renewal_notice_days'] ?? ($settings->default_renewal_notice_days ?? 30),
            'salary_gross' => $data['salary_gross'] ?? $employee->salary ?? null,
            'salary_net' => $data['salary_net'] ?? null,
            'currency' => $data['currency'] ?? 'KM',
            'position_title' => $data['position_title'] ?? $employee->position ?? null,
            'store_name' => $data['store_name'] ?? ($store->name ?? $employee->store ?? null),
            'store_city' => $data['store_city'] ?? ($store->city ?? null),
            'employee_full_name' => $data['employee_full_name'] ?? $employee->name ?? null,
            'employee_origin' => $data['employee_origin'] ?? null,
            'employee_address' => $data['employee_address'] ?? ($employee->private_address ?? $employee->address ?? null),
            'employee_education' => $data['employee_education'] ?? null,
            'custom_fields' => isset($data['custom_fields']) ? json_encode($data['custom_fields']) : null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
            'updated_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function loadEmployeeContext(int $employeeId): ?object
    {
        if (!Schema::hasTable('hrm_employees')) {
            return null;
        }

        return DB::table('hrm_employees')
            ->select('hrm_employees.*', 'users.name')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->where('hrm_employees.id', $employeeId)
            ->first();
    }

    private function findContract(int $id): ?object
    {
        return DB::table('hrm_employment_contracts')
            ->select(
                'hrm_employment_contracts.*',
                'users.name as employee_user_name',
                'hrm_stores.name as store_label',
                'hrm_contract_templates.name as template_name',
                'hrm_contract_templates.output_format'
            )
            ->leftJoin('hrm_employees', 'hrm_employment_contracts.employee_id', '=', 'hrm_employees.id')
            ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
            ->leftJoin('hrm_stores', 'hrm_employment_contracts.store_id', '=', 'hrm_stores.id')
            ->leftJoin('hrm_contract_templates', 'hrm_employment_contracts.template_id', '=', 'hrm_contract_templates.id')
            ->where('hrm_employment_contracts.id', $id)
            ->first();
    }
}
