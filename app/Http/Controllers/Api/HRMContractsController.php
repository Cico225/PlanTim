<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HRM\ContractDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class HRMContractsController extends Controller
{
    private const TEMPLATE_DISK_DIR = 'hr-contract-templates';

    public function __construct(
        private readonly ContractDocumentService $documentService
    ) {
    }

    public function templates(Request $request)
    {
        $query = DB::table('hrm_contract_templates')
            ->orderBy('legal_entity')
            ->orderBy('job_role')
            ->orderBy('name');

        if (!$request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        $templates = $query->get()->map(fn ($template) => $this->formatTemplate($template));

        return response()->json($templates);
    }

    public function storeTemplate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:20480',
            'name' => 'required|string|max:255',
            'legal_entity' => 'required|in:fbih,rs,bd',
            'job_role' => 'required|in:store_manager,deputy_manager,salesperson',
            'document_kind' => 'nullable|in:full_contract,annex',
            'output_format' => 'nullable|in:docx,pdf',
            'code' => 'nullable|string|max:80|unique:hrm_contract_templates,code',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Neispravni podaci.', 'errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension() ?: '');
        if (!in_array($extension, ['doc', 'docx', 'pdf'], true)) {
            return response()->json([
                'message' => 'Dozvoljeni formati šablona: DOC, DOCX, PDF.',
            ], 422);
        }

        $storedName = $this->storeTemplateFile($file, $extension);

        $outputFormat = $request->input('output_format')
            ?: ($extension === 'docx' ? 'docx' : 'pdf');

        $code = $request->input('code')
            ?: $this->makeTemplateCode(
                $request->input('legal_entity'),
                $request->input('job_role')
            );

        $id = DB::table('hrm_contract_templates')->insertGetId([
            'code' => $code,
            'name' => $request->input('name'),
            'legal_entity' => $request->input('legal_entity'),
            'job_role' => $request->input('job_role'),
            'document_kind' => $request->input('document_kind', 'full_contract'),
            'template_file' => $storedName,
            'output_format' => $outputFormat,
            'placeholder_keys' => null,
            'is_active' => $request->boolean('is_active', true),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $template = DB::table('hrm_contract_templates')->where('id', $id)->first();

        return response()->json([
            'message' => 'Šablon ugovora je učitan.',
            'template' => $this->formatTemplate($template),
        ], 201);
    }

    public function uploadTemplateFile(Request $request, $id)
    {
        $template = DB::table('hrm_contract_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Šablon nije pronađen.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:20480',
            'name' => 'nullable|string|max:255',
            'output_format' => 'nullable|in:docx,pdf',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Neispravni podaci.', 'errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension() ?: '');
        if (!in_array($extension, ['doc', 'docx', 'pdf'], true)) {
            return response()->json([
                'message' => 'Dozvoljeni formati šablona: DOC, DOCX, PDF.',
            ], 422);
        }

        $storedName = $this->storeTemplateFile($file, $extension);

        $this->deleteTemplateFileIfManaged($template->template_file);

        $updates = [
            'template_file' => $storedName,
            'updated_at' => now(),
        ];

        if ($request->filled('name')) {
            $updates['name'] = $request->input('name');
        }

        if ($request->filled('output_format')) {
            $updates['output_format'] = $request->input('output_format');
        } elseif (in_array($extension, ['docx', 'pdf'], true)) {
            $updates['output_format'] = $extension === 'docx' ? 'docx' : 'pdf';
        }

        if ($request->has('is_active')) {
            $updates['is_active'] = $request->boolean('is_active');
        }

        DB::table('hrm_contract_templates')->where('id', $id)->update($updates);

        $updated = DB::table('hrm_contract_templates')->where('id', $id)->first();

        return response()->json([
            'message' => 'Datoteka šablona je ažurirana.',
            'template' => $this->formatTemplate($updated),
        ]);
    }

    public function downloadTemplate($id)
    {
        $template = DB::table('hrm_contract_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Šablon nije pronađen.'], 404);
        }

        $relative = self::TEMPLATE_DISK_DIR . '/' . ltrim($template->template_file, '/');
        if (!Storage::disk('local')->exists($relative)) {
            return response()->json(['message' => 'Datoteka šablona ne postoji na serveru.'], 404);
        }

        return Storage::disk('local')->download($relative, basename($template->template_file));
    }

    public function updateTemplate(Request $request, $id)
    {
        $template = DB::table('hrm_contract_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Šablon nije pronađen.'], 404);
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'legal_entity' => 'sometimes|required|in:fbih,rs,bd',
            'job_role' => 'sometimes|required|in:store_manager,deputy_manager,salesperson',
            'document_kind' => 'sometimes|required|in:full_contract,annex',
            'output_format' => 'sometimes|required|in:docx,pdf',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $data['updated_at'] = now();
        DB::table('hrm_contract_templates')->where('id', $id)->update($data);

        $updated = DB::table('hrm_contract_templates')->where('id', $id)->first();

        return response()->json([
            'message' => 'Šablon je ažuriran.',
            'template' => $this->formatTemplate($updated),
        ]);
    }

    private function formatTemplate(object $template): array
    {
        $relative = self::TEMPLATE_DISK_DIR . '/' . ltrim((string) $template->template_file, '/');
        $exists = Storage::disk('local')->exists($relative);

        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'legal_entity' => $template->legal_entity,
            'job_role' => $template->job_role,
            'document_kind' => $template->document_kind,
            'template_file' => $template->template_file,
            'file_name' => basename((string) $template->template_file),
            'output_format' => $template->output_format,
            'placeholder_keys' => $template->placeholder_keys
                ? (is_string($template->placeholder_keys)
                    ? json_decode($template->placeholder_keys, true)
                    : $template->placeholder_keys)
                : null,
            'is_active' => (bool) $template->is_active,
            'file_exists' => $exists,
            'file_size' => $exists ? Storage::disk('local')->size($relative) : null,
            'created_at' => $template->created_at,
            'updated_at' => $template->updated_at,
        ];
    }

    private function storeTemplateFile($file, string $extension): string
    {
        Storage::disk('local')->makeDirectory(self::TEMPLATE_DISK_DIR);

        $safeBase = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'sablon';
        $storedName = $safeBase . '_' . now()->format('Ymd_His') . '_' . Str::lower(Str::random(4)) . '.' . $extension;

        $file->storeAs(self::TEMPLATE_DISK_DIR, $storedName, 'local');

        return $storedName;
    }

    private function makeTemplateCode(string $legalEntity, string $jobRole): string
    {
        $base = $legalEntity . '_' . $jobRole;
        $code = $base;
        $i = 2;

        while (DB::table('hrm_contract_templates')->where('code', $code)->exists()) {
            $code = $base . '_' . $i;
            $i++;
        }

        return $code;
    }

    private function deleteTemplateFileIfManaged(?string $fileName): void
    {
        if (!$fileName) {
            return;
        }

        // Keep seeded original names; only remove uniquely stored uploads.
        if (!preg_match('/_\d{8}_\d{6}_[a-z0-9]{4}\./i', $fileName)) {
            return;
        }

        $relative = self::TEMPLATE_DISK_DIR . '/' . ltrim($fileName, '/');
        if (Storage::disk('local')->exists($relative)) {
            Storage::disk('local')->delete($relative);
        }
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

    public function bulkUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1|max:500',
            'ids.*' => 'integer|exists:hrm_employment_contracts,id',
            'employment_term' => 'nullable|in:indefinite,fixed',
            'duration_months' => 'nullable|integer|min:1|max:60',
            'duration_from' => 'nullable|in:work_start,effective,today',
            'status' => 'nullable|in:draft,active,expired,terminated,superseded',
            'auto_renew' => 'nullable|boolean',
            'renewal_notice_days' => 'nullable|integer|min:1|max:365',
            'expiry_date' => 'nullable|date',
            'work_end_date' => 'nullable|date',
            'salary_gross' => 'nullable|numeric|min:0',
            'salary_net' => 'nullable|numeric|min:0',
            'store_id' => 'nullable|exists:hrm_stores,id',
            'notes' => 'nullable|string',
            'generate_document' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Neispravni podaci za masovnu izmjenu.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $ids = array_values(array_unique(array_map('intval', $request->input('ids', []))));
        $contracts = DB::table('hrm_employment_contracts')->whereIn('id', $ids)->get()->keyBy('id');

        if ($contracts->isEmpty()) {
            return response()->json(['message' => 'Nijedan ugovor nije pronađen.'], 404);
        }

        $shared = collect($request->only([
            'employment_term', 'status', 'auto_renew', 'renewal_notice_days',
            'expiry_date', 'work_end_date', 'salary_gross', 'salary_net', 'store_id', 'notes',
        ]))->filter(fn ($value) => $value !== null && $value !== '')->all();

        if (array_key_exists('auto_renew', $shared)) {
            $shared['auto_renew'] = (bool) $shared['auto_renew'];
        }

        $durationMonths = $request->filled('duration_months')
            ? (int) $request->input('duration_months')
            : null;
        $durationFrom = $request->input('duration_from', 'work_start');

        if ($durationMonths !== null) {
            $shared['employment_term'] = 'fixed';
            unset($shared['expiry_date'], $shared['work_end_date']);
        } elseif (($shared['employment_term'] ?? null) === 'indefinite') {
            $shared['expiry_date'] = null;
            $shared['work_end_date'] = null;
        }

        if ($shared === [] && $durationMonths === null) {
            return response()->json([
                'message' => 'Odaberite barem jedno polje za izmjenu.',
            ], 422);
        }

        $updated = 0;
        $failed = [];
        $userId = $request->user()?->id;
        $generate = $request->boolean('generate_document');

        foreach ($ids as $id) {
            $contract = $contracts->get($id);
            if (!$contract) {
                $failed[] = ['id' => $id, 'message' => 'Ugovor nije pronađen.'];
                continue;
            }

            try {
                $payload = $shared;

                if ($durationMonths !== null) {
                    $baseDate = match ($durationFrom) {
                        'today' => now()->toDateString(),
                        'effective' => $contract->effective_date
                            ?: $contract->work_start_date
                            ?: now()->toDateString(),
                        default => $contract->work_start_date
                            ?: $contract->effective_date
                            ?: now()->toDateString(),
                    };

                    $endDate = \Carbon\Carbon::parse($baseDate)
                        ->addMonthsNoOverflow($durationMonths)
                        ->toDateString();

                    $payload['employment_term'] = 'fixed';
                    $payload['expiry_date'] = $endDate;
                    $payload['work_end_date'] = $endDate;
                }

                if (($payload['employment_term'] ?? null) === 'indefinite') {
                    $payload['expiry_date'] = null;
                    $payload['work_end_date'] = null;
                }

                if (array_key_exists('store_id', $payload) && $payload['store_id']) {
                    $store = DB::table('hrm_stores')->where('id', $payload['store_id'])->first();
                    if ($store) {
                        $payload['store_name'] = $store->name;
                        $payload['store_city'] = $store->city ?? null;
                    }
                }

                $payload['updated_by'] = $userId;
                $payload['updated_at'] = now();

                DB::table('hrm_employment_contracts')->where('id', $id)->update($payload);

                if ($generate) {
                    $this->generateDocumentInternal($id, $userId);
                }

                $updated++;
            } catch (\Throwable $e) {
                $failed[] = ['id' => $id, 'message' => $e->getMessage()];
            }
        }

        return response()->json([
            'message' => "Ažurirano ugovora: {$updated}.",
            'updated' => $updated,
            'failed' => $failed,
        ]);
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
