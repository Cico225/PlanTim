<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HRM\DecisionDocumentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HRMDecisionsController extends Controller
{
    private const TEMPLATE_DIR = 'hr-decision-templates';

    public function __construct(private readonly DecisionDocumentService $documents)
    {
    }

    public function settings()
    {
        return response()->json($this->settingsArray());
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'decision_number_prefix' => 'nullable|string|max:40',
            'decision_number_next' => 'required|integer|min:1|max:999999',
            'default_annual_leave_days' => 'required|integer|min:0|max:60',
            'generate_document_by_default' => 'required|boolean',
        ]);

        if (($data['decision_number_prefix'] ?? null) === '') {
            $data['decision_number_prefix'] = null;
        }

        $existing = DB::table('hrm_decision_settings')->first();
        if ($existing) {
            DB::table('hrm_decision_settings')->where('id', $existing->id)->update($data + ['updated_at' => now()]);
        } else {
            DB::table('hrm_decision_settings')->insert($data + ['created_at' => now(), 'updated_at' => now()]);
        }

        return $this->settings();
    }

    public function templates()
    {
        $rows = DB::table('hrm_decision_templates')->orderBy('name')->get();
        $counts = DB::table('hrm_decisions')
            ->select('template_id', DB::raw('count(*) as total'))
            ->whereNotNull('template_id')
            ->groupBy('template_id')
            ->pluck('total', 'template_id');

        return response()->json($rows->map(function ($row) use ($counts) {
            $path = storage_path('app/' . self::TEMPLATE_DIR . '/' . $row->template_file);
            $row->decisions_count = (int) ($counts[$row->id] ?? 0);
            $row->file_exists = is_file($path);
            return $row;
        }));
    }

    public function storeTemplate(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'kind' => 'required|in:annual_leave,unpaid_leave,employment,position_change,salary_change,termination,other',
            'file' => 'required|file|max:15360',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['doc', 'docx', 'pdf'], true)) {
            return response()->json(['message' => 'Dozvoljeni formati su DOC, DOCX i PDF.'], 422);
        }

        $stored = now()->format('Ymd_His') . '_' . Str::lower(Str::random(4)) . '.' . $extension;
        $file->storeAs(self::TEMPLATE_DIR, $stored, 'local');

        $id = DB::table('hrm_decision_templates')->insertGetId([
            'name' => $data['name'],
            'kind' => $data['kind'],
            'template_file' => $stored,
            'output_format' => $extension === 'pdf' ? 'pdf' : 'docx',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('hrm_decision_templates')->where('id', $id)->first(), 201);
    }

    public function destroyTemplate($id)
    {
        $template = DB::table('hrm_decision_templates')->where('id', $id)->first();
        if (!$template) {
            return response()->json(['message' => 'Šablon nije pronađen.'], 404);
        }

        $used = DB::table('hrm_decisions')->where('template_id', $id)->count();
        if ($used > 0) {
            return response()->json(['message' => "Šablon se koristi u {$used} rješenja. Možete ga samo deaktivirati."], 409);
        }

        $relative = self::TEMPLATE_DIR . '/' . $template->template_file;
        if (Storage::disk('local')->exists($relative)) {
            Storage::disk('local')->delete($relative);
        }
        DB::table('hrm_decision_templates')->where('id', $id)->delete();

        return response()->json(['message' => 'Šablon je obrisan.']);
    }

    public function summary()
    {
        $year = (int) now()->year;

        return response()->json([
            'total' => DB::table('hrm_decisions')->count(),
            'issued' => DB::table('hrm_decisions')->where('status', 'issued')->count(),
            'draft' => DB::table('hrm_decisions')->where('status', 'draft')->count(),
            'leave_days_used' => (int) DB::table('hrm_decisions')
                ->where('kind', 'annual_leave')
                ->where('leave_year', $year)
                ->where('status', 'issued')
                ->sum('days'),
        ]);
    }

    public function index(Request $request)
    {
        $query = DB::table('hrm_decisions as d')
            ->leftJoin('hrm_employment_contracts as c', 'c.id', '=', 'd.contract_id')
            ->leftJoin('hrm_employees as e', 'e.id', '=', 'd.employee_id')
            ->leftJoin('users as u', 'u.id', '=', 'e.user_id')
            ->select(
                'd.*',
                'c.contract_number',
                'c.employee_full_name',
                'u.name as employee_user_name'
            );

        if ($request->filled('kind')) {
            $query->where('d.kind', $request->input('kind'));
        }
        if ($request->filled('status')) {
            $query->where('d.status', $request->input('status'));
        }
        if ($request->filled('year')) {
            $query->whereYear('d.decision_date', (int) $request->input('year'));
        }
        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($inner) use ($search) {
                $inner->where('d.decision_number', 'like', $search)
                    ->orWhere('d.title', 'like', $search)
                    ->orWhere('c.employee_full_name', 'like', $search)
                    ->orWhere('u.name', 'like', $search)
                    ->orWhere('c.contract_number', 'like', $search);
            });
        }

        return response()->json(
            $query->orderByDesc('d.decision_date')->orderByDesc('d.id')->paginate((int) $request->input('per_page', 100))
        );
    }

    public function leaveRegister(Request $request)
    {
        $year = (int) $request->input('year', now()->year);
        $settings = $this->settingsArray();
        $defaultDays = (int) $settings['default_annual_leave_days'];

        $contracts = DB::table('hrm_employment_contracts as c')
            ->leftJoin('hrm_employees as e', 'e.id', '=', 'c.employee_id')
            ->leftJoin('users as u', 'u.id', '=', 'e.user_id')
            ->whereNotIn('c.status', ['terminated'])
            ->orderByRaw("CASE c.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END")
            ->orderByDesc('c.id')
            ->get([
                'c.id as contract_id',
                'c.contract_number',
                'c.status as contract_status',
                'c.employee_id',
                'c.employee_full_name',
                'c.store_name',
                'u.name as user_name',
            ]);

        $byEmployee = [];
        foreach ($contracts as $contract) {
            if (!isset($byEmployee[$contract->employee_id])) {
                $byEmployee[$contract->employee_id] = $contract;
            }
        }

        $entitlements = DB::table('hrm_leave_entitlements')->where('year', $year)->get()->keyBy('employee_id');
        $used = DB::table('hrm_decisions')
            ->select('employee_id', DB::raw('SUM(days) as used_days'))
            ->where('kind', 'annual_leave')
            ->where('leave_year', $year)
            ->where('status', 'issued')
            ->groupBy('employee_id')
            ->get()
            ->keyBy('employee_id');

        $rows = [];
        foreach ($byEmployee as $employeeId => $contract) {
            $entitlement = $entitlements->get($employeeId);
            $entitled = $entitlement ? (int) $entitlement->entitled_days : $defaultDays;
            $carried = $entitlement ? (int) $entitlement->carried_over_days : 0;
            $usedDays = (int) ($used->get($employeeId)->used_days ?? 0);
            $rows[] = [
                'employee_id' => (int) $employeeId,
                'employee_name' => $contract->employee_full_name ?: $contract->user_name,
                'contract_id' => (int) $contract->contract_id,
                'contract_number' => $contract->contract_number,
                'contract_status' => $contract->contract_status,
                'store_name' => $contract->store_name,
                'year' => $year,
                'entitled_days' => $entitled,
                'carried_over_days' => $carried,
                'used_days' => $usedDays,
                'remaining_days' => $entitled + $carried - $usedDays,
            ];
        }

        usort($rows, fn ($a, $b) => strcasecmp((string) $a['employee_name'], (string) $b['employee_name']));

        return response()->json([
            'year' => $year,
            'default_annual_leave_days' => $defaultDays,
            'rows' => $rows,
        ]);
    }

    public function updateEntitlement(Request $request, $employeeId)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'entitled_days' => 'required|integer|min:0|max:60',
            'carried_over_days' => 'required|integer|min:0|max:60',
        ]);

        $employee = DB::table('hrm_employees')->where('id', $employeeId)->first();
        if (!$employee) {
            return response()->json(['message' => 'Zaposlenik nije pronađen.'], 404);
        }

        $used = $this->usedLeaveDays((int) $employeeId, (int) $data['year']);
        if ($data['entitled_days'] + $data['carried_over_days'] < $used) {
            return response()->json([
                'message' => "Radnik je već iskoristio {$used} dana. Pravo i prenos ne mogu biti manji od toga.",
            ], 422);
        }

        DB::table('hrm_leave_entitlements')->updateOrInsert(
            ['employee_id' => $employeeId, 'year' => $data['year']],
            [
                'entitled_days' => $data['entitled_days'],
                'carried_over_days' => $data['carried_over_days'],
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['message' => 'Pravo na godišnji odmor je sačuvano.']);
    }

    public function leavePlan(Request $request)
    {
        $year = (int) $request->input('year', now()->year);

        $items = DB::table('hrm_leave_plan_items as p')
            ->leftJoin('hrm_employment_contracts as c', 'c.id', '=', 'p.contract_id')
            ->leftJoin('hrm_employees as e', 'e.id', '=', 'p.employee_id')
            ->leftJoin('users as u', 'u.id', '=', 'e.user_id')
            ->leftJoin('hrm_decision_templates as t', 't.id', '=', 'p.template_id')
            ->where('p.year', $year)
            ->orderBy('c.employee_full_name')
            ->orderBy('p.date_from')
            ->get([
                'p.*',
                'c.contract_number',
                'c.employee_full_name',
                'u.name as employee_user_name',
                't.name as template_name',
            ]);

        return response()->json([
            'year' => $year,
            'items' => $items->map(function ($item) {
                $item->employee_name = $item->employee_full_name ?: $item->employee_user_name;
                return $item;
            }),
        ]);
    }

    public function storeLeavePlan(Request $request)
    {
        $data = $this->validatePlan($request);
        $contract = $this->activeContract((int) $data['employee_id'], $data['contract_id'] ?? null);
        if (!$contract) {
            return response()->json(['message' => 'Radnik nema ugovor o radu.'], 422);
        }

        $days = (int) ($data['days'] ?? $this->workingDays($data['date_from'], $data['date_to']));
        $check = $this->assertPlanFits((int) $data['employee_id'], (int) $data['year'], $days);
        if ($check) {
            return $check;
        }

        $id = DB::table('hrm_leave_plan_items')->insertGetId([
            'year' => $data['year'],
            'employee_id' => $data['employee_id'],
            'contract_id' => $contract->id,
            'date_from' => $data['date_from'],
            'date_to' => $data['date_to'],
            'days' => $days,
            'status' => 'planned',
            'template_id' => $data['template_id'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('hrm_leave_plan_items')->where('id', $id)->first(), 201);
    }

    public function updateLeavePlan(Request $request, $id)
    {
        $item = DB::table('hrm_leave_plan_items')->where('id', $id)->first();
        if (!$item) {
            return response()->json(['message' => 'Stavka plana nije pronađena.'], 404);
        }
        if ($item->status === 'confirmed') {
            return response()->json(['message' => 'Potvrđena stavka se ne može mijenjati.'], 422);
        }

        $data = $this->validatePlan($request);
        $contract = $this->activeContract((int) $data['employee_id'], $data['contract_id'] ?? null);
        if (!$contract) {
            return response()->json(['message' => 'Radnik nema ugovor o radu.'], 422);
        }

        $days = (int) ($data['days'] ?? $this->workingDays($data['date_from'], $data['date_to']));
        $check = $this->assertPlanFits((int) $data['employee_id'], (int) $data['year'], $days, (int) $id);
        if ($check) {
            return $check;
        }

        DB::table('hrm_leave_plan_items')->where('id', $id)->update([
            'year' => $data['year'],
            'employee_id' => $data['employee_id'],
            'contract_id' => $contract->id,
            'date_from' => $data['date_from'],
            'date_to' => $data['date_to'],
            'days' => $days,
            'template_id' => $data['template_id'] ?? null,
            'notes' => $data['notes'] ?? null,
            'updated_by' => $request->user()?->id,
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('hrm_leave_plan_items')->where('id', $id)->first());
    }

    public function destroyLeavePlan($id)
    {
        $item = DB::table('hrm_leave_plan_items')->where('id', $id)->first();
        if (!$item) {
            return response()->json(['message' => 'Stavka plana nije pronađena.'], 404);
        }
        if ($item->status === 'confirmed') {
            return response()->json(['message' => 'Potvrđena stavka se ne može brisati.'], 422);
        }

        DB::table('hrm_leave_plan_items')->where('id', $id)->delete();

        return response()->json(['message' => 'Stavka plana je obrisana.']);
    }

    public function confirmLeavePlan(Request $request)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'generate_document' => 'nullable|boolean',
        ]);

        $items = DB::table('hrm_leave_plan_items')
            ->where('year', $data['year'])
            ->where('status', 'planned')
            ->orderBy('employee_id')
            ->orderBy('date_from')
            ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Nema nepotvrđenih stavki u planu.'], 422);
        }

        $missingTemplate = $items->filter(fn ($item) => empty($item->template_id))->count();
        if ($missingTemplate > 0) {
            return response()->json([
                'message' => "Svakom periodu dodijelite šablon prije potvrde. Nedostaje za {$missingTemplate} perioda.",
            ], 422);
        }

        $plannedByEmployee = [];
        foreach ($items as $item) {
            $plannedByEmployee[$item->employee_id] = ($plannedByEmployee[$item->employee_id] ?? 0) + (int) $item->days;
        }

        $errors = [];
        foreach ($plannedByEmployee as $employeeId => $days) {
            $balance = $this->leaveBalance((int) $employeeId, (int) $data['year']);
            if ($days > $balance['remaining_days']) {
                $name = DB::table('hrm_employment_contracts')
                    ->where('employee_id', $employeeId)
                    ->orderByDesc('id')
                    ->value('employee_full_name') ?: ('Radnik #' . $employeeId);
                $errors[] = "{$name}: planirano {$days}, ostalo {$balance['remaining_days']}.";
            }
        }

        if ($errors) {
            return response()->json([
                'message' => 'Plan prelazi preostale dane. ' . implode(' ', $errors),
            ], 422);
        }

        $settings = $this->settingsArray();
        $generate = $request->has('generate_document')
            ? $request->boolean('generate_document')
            : (bool) $settings['generate_document_by_default'];
        $userId = $request->user()?->id;
        $created = 0;

        DB::transaction(function () use ($items, $generate, $userId, &$created) {
            foreach ($items as $item) {
                $decisionId = $this->insertDecision([
                    'employee_id' => $item->employee_id,
                    'contract_id' => $item->contract_id,
                    'template_id' => $item->template_id,
                    'kind' => 'annual_leave',
                    'title' => $this->defaultTitle('annual_leave'),
                    'status' => 'issued',
                    'decision_date' => now()->toDateString(),
                    'effective_date' => $item->date_from,
                    'date_from' => $item->date_from,
                    'date_to' => $item->date_to,
                    'days' => (int) $item->days,
                    'leave_year' => (int) $item->year,
                    'notes' => $item->notes ?: 'Generisano iz plana godišnjih odmora.',
                ], $userId, $generate);

                DB::table('hrm_leave_plan_items')->where('id', $item->id)->update([
                    'status' => 'confirmed',
                    'decision_id' => $decisionId,
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]);
                $created++;
            }
        });

        return response()->json([
            'message' => "Potvrđen plan. Generisano rješenja: {$created}.",
            'created' => $created,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateDecision($request);
        $contract = $this->activeContract((int) $data['employee_id'], $data['contract_id'] ?? null);
        if (!$contract) {
            return response()->json(['message' => 'Radnik nema ugovor o radu.'], 422);
        }

        $days = $this->resolveDays($data);
        if ($data['kind'] === 'annual_leave') {
            $year = (int) ($data['leave_year'] ?? Carbon::parse($data['date_from'])->year);
            $data['leave_year'] = $year;
            $check = $this->assertLeaveAvailable((int) $data['employee_id'], $year, $days);
            if ($check) {
                return $check;
            }
        }

        $settings = $this->settingsArray();
        $generate = $request->has('generate_document')
            ? $request->boolean('generate_document')
            : (bool) $settings['generate_document_by_default'];

        $id = $this->insertDecision([
            'employee_id' => $data['employee_id'],
            'contract_id' => $contract->id,
            'template_id' => $data['template_id'] ?? null,
            'decision_number' => $data['decision_number'] ?? null,
            'kind' => $data['kind'],
            'title' => $data['title'] ?? null,
            'status' => $data['status'] ?? 'issued',
            'decision_date' => $data['decision_date'] ?? now()->toDateString(),
            'effective_date' => $data['effective_date'] ?? ($data['date_from'] ?? null),
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,
            'days' => $days,
            'leave_year' => $data['leave_year'] ?? null,
            'notes' => $data['notes'] ?? null,
        ], $request->user()?->id, $generate && ($data['status'] ?? 'issued') !== 'cancelled');

        return response()->json($this->findDecision($id), 201);
    }

    public function cancel(Request $request, $id)
    {
        $decision = DB::table('hrm_decisions')->where('id', $id)->first();
        if (!$decision) {
            return response()->json(['message' => 'Rješenje nije pronađeno.'], 404);
        }

        DB::table('hrm_decisions')->where('id', $id)->update([
            'status' => 'cancelled',
            'updated_by' => $request->user()?->id,
            'updated_at' => now(),
        ]);

        return response()->json($this->findDecision((int) $id));
    }

    public function generateDocument(Request $request, $id)
    {
        $decision = $this->generateInternal((int) $id, $request->user()?->id);
        if (!$decision) {
            return response()->json(['message' => 'Rješenje nije pronađeno.'], 404);
        }

        return response()->json($decision);
    }

    public function downloadDocument($id)
    {
        $decision = DB::table('hrm_decisions')->where('id', $id)->first();
        if (!$decision || !$decision->generated_document_path) {
            return response()->json(['message' => 'Generisani dokument nije dostupan.'], 404);
        }
        if (!Storage::disk('local')->exists($decision->generated_document_path)) {
            return response()->json(['message' => 'Datoteka dokumenta ne postoji.'], 404);
        }

        return Storage::disk('local')->download(
            $decision->generated_document_path,
            basename($decision->generated_document_path)
        );
    }

    private function insertDecision(array $data, ?int $userId, bool $generate): int
    {
        $number = $data['decision_number'] ?? null;
        if (!$number) {
            $number = $this->assignDecisionNumber();
        }

        $title = $data['title'] ?: $this->defaultTitle($data['kind']);
        $id = DB::table('hrm_decisions')->insertGetId([
            'employee_id' => $data['employee_id'],
            'contract_id' => $data['contract_id'] ?? null,
            'template_id' => $data['template_id'] ?? $this->defaultTemplateId($data['kind']),
            'decision_number' => $number,
            'kind' => $data['kind'],
            'title' => $title,
            'status' => $data['status'] ?? 'issued',
            'decision_date' => $data['decision_date'] ?? now()->toDateString(),
            'effective_date' => $data['effective_date'] ?? ($data['date_from'] ?? null),
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,
            'days' => $data['days'] ?? null,
            'leave_year' => $data['leave_year'] ?? null,
            'notes' => $data['notes'] ?? null,
            'content' => $data['notes'] ?? $title,
            'created_by' => $userId,
            'updated_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($generate) {
            $this->generateInternal($id, $userId);
        }

        return $id;
    }

    private function validatePlan(Request $request): array
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'employee_id' => 'required|exists:hrm_employees,id',
            'contract_id' => 'nullable|exists:hrm_employment_contracts,id',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'days' => 'nullable|integer|min:1|max:366',
            'notes' => 'nullable|string',
            'template_id' => 'nullable|exists:hrm_decision_templates,id',
        ]);

        if (empty($data['days']) && $this->workingDays($data['date_from'], $data['date_to']) < 1) {
            abort(response()->json(['message' => 'U odabranom periodu nema radnih dana.'], 422));
        }

        return $data;
    }

    private function assertPlanFits(int $employeeId, int $year, int $days, ?int $ignoreId = null)
    {
        if ($days < 1) {
            return response()->json(['message' => 'Unesite broj radnih dana.'], 422);
        }

        $balance = $this->leaveBalance($employeeId, $year);
        $alreadyPlanned = (int) DB::table('hrm_leave_plan_items')
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('status', 'planned')
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->sum('days');

        $free = $balance['remaining_days'] - $alreadyPlanned;
        if ($days > $free) {
            return response()->json([
                'message' => "Za plan je slobodno {$free} dana, a uneseno je {$days}.",
            ], 422);
        }

        return null;
    }

    private function generateInternal(int $id, ?int $userId): ?object
    {
        $decision = $this->findDecision($id);
        if (!$decision) {
            return null;
        }

        $template = $decision->template_id
            ? DB::table('hrm_decision_templates')->where('id', $decision->template_id)->first()
            : null;

        $path = $this->documents->generate($decision, $template, $this->placeholderValues($decision));
        DB::table('hrm_decisions')->where('id', $id)->update([
            'generated_document_path' => $path,
            'file_path' => $path,
            'updated_by' => $userId,
            'updated_at' => now(),
        ]);

        return $this->findDecision($id);
    }

    private function validateDecision(Request $request): array
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:hrm_employees,id',
            'contract_id' => 'nullable|exists:hrm_employment_contracts,id',
            'template_id' => 'nullable|exists:hrm_decision_templates,id',
            'decision_number' => 'nullable|string|max:80',
            'kind' => 'required|in:annual_leave,unpaid_leave,employment,position_change,salary_change,termination,other',
            'title' => 'nullable|string|max:255',
            'status' => 'nullable|in:draft,issued,cancelled',
            'decision_date' => 'nullable|date',
            'effective_date' => 'nullable|date',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'days' => 'nullable|integer|min:1|max:366',
            'leave_year' => 'nullable|integer|min:2000|max:2100',
            'notes' => 'nullable|string',
            'generate_document' => 'nullable|boolean',
        ]);

        if (in_array($data['kind'], ['annual_leave', 'unpaid_leave'], true)) {
            if (empty($data['date_from']) || empty($data['date_to'])) {
                abort(response()->json(['message' => 'Za odsustvo unesite datum od i datum do.'], 422));
            }
        }

        return $data;
    }

    private function resolveDays(array $data): ?int
    {
        if (!empty($data['days'])) {
            return (int) $data['days'];
        }
        if (!empty($data['date_from']) && !empty($data['date_to'])) {
            return $this->workingDays($data['date_from'], $data['date_to']);
        }

        return null;
    }

    private function workingDays(string $from, string $to): int
    {
        $start = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->startOfDay();
        if ($end->lt($start)) {
            return 0;
        }

        $days = 0;
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                $days++;
            }
        }

        return $days;
    }

    private function assertLeaveAvailable(int $employeeId, int $year, ?int $days)
    {
        if (!$days || $days < 1) {
            return response()->json(['message' => 'Unesite broj radnih dana godišnjeg odmora.'], 422);
        }

        $balance = $this->leaveBalance($employeeId, $year);
        if ($days > $balance['remaining_days']) {
            return response()->json([
                'message' => "Ostalo je {$balance['remaining_days']} dana, a traženo je {$days}.",
            ], 422);
        }

        return null;
    }

    private function leaveBalance(int $employeeId, int $year): array
    {
        $settings = $this->settingsArray();
        $entitlement = DB::table('hrm_leave_entitlements')
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->first();
        $entitled = $entitlement ? (int) $entitlement->entitled_days : (int) $settings['default_annual_leave_days'];
        $carried = $entitlement ? (int) $entitlement->carried_over_days : 0;
        $used = $this->usedLeaveDays($employeeId, $year);

        return [
            'entitled_days' => $entitled,
            'carried_over_days' => $carried,
            'used_days' => $used,
            'remaining_days' => $entitled + $carried - $used,
        ];
    }

    private function usedLeaveDays(int $employeeId, int $year): int
    {
        return (int) DB::table('hrm_decisions')
            ->where('employee_id', $employeeId)
            ->where('kind', 'annual_leave')
            ->where('leave_year', $year)
            ->where('status', 'issued')
            ->sum('days');
    }

    private function activeContract(int $employeeId, ?int $contractId): ?object
    {
        $query = DB::table('hrm_employment_contracts')
            ->where('employee_id', $employeeId)
            ->whereNotIn('status', ['terminated']);
        if ($contractId) {
            $query->where('id', $contractId);
        }

        return $query
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END")
            ->orderByDesc('id')
            ->first();
    }

    private function defaultTemplateId(string $kind): ?int
    {
        $id = DB::table('hrm_decision_templates')
            ->where('kind', $kind)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->value('id');

        return $id ? (int) $id : null;
    }

    private function assignDecisionNumber(): ?string
    {
        return DB::transaction(function () {
            $row = DB::table('hrm_decision_settings')->lockForUpdate()->first();
            if (!$row) {
                return null;
            }
            $prefix = trim((string) ($row->decision_number_prefix ?? ''));
            if ($prefix === '') {
                return null;
            }
            $next = max(1, (int) $row->decision_number_next);
            DB::table('hrm_decision_settings')->where('id', $row->id)->update([
                'decision_number_next' => $next + 1,
                'updated_at' => now(),
            ]);

            return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }

    private function findDecision(int $id): ?object
    {
        return DB::table('hrm_decisions as d')
            ->leftJoin('hrm_employment_contracts as c', 'c.id', '=', 'd.contract_id')
            ->leftJoin('hrm_employees as e', 'e.id', '=', 'd.employee_id')
            ->leftJoin('users as u', 'u.id', '=', 'e.user_id')
            ->select('d.*', 'c.contract_number', 'c.employee_full_name', 'c.store_name', 'u.name as employee_user_name')
            ->where('d.id', $id)
            ->first();
    }

    /**
     * @return array<string, string>
     */
    private function placeholderValues(object $decision): array
    {
        $contractSettings = DB::table('hrm_contract_settings')->first();
        $format = static fn ($date) => $date ? Carbon::parse($date)->format('d.m.Y.') : '';
        $name = $decision->employee_full_name ?: $decision->employee_user_name ?: '';
        $balance = ['used_days' => '', 'remaining_days' => '', 'entitled_days' => ''];
        if ($decision->kind === 'annual_leave' && $decision->leave_year) {
            $balance = $this->leaveBalance((int) $decision->employee_id, (int) $decision->leave_year);
        }

        $body = $decision->notes ?: match ($decision->kind) {
            'annual_leave' => "Odobrava se korištenje godišnjeg odmora u trajanju od {$decision->days} radnih dana.",
            'unpaid_leave' => "Odobrava se neplaćeno odsustvo u trajanju od {$decision->days} radnih dana.",
            default => 'Rješenje se primjenjuje od navedenog datuma.',
        };

        return [
            'decision_number' => (string) ($decision->decision_number ?? ''),
            'decision_date' => $format($decision->decision_date),
            'title' => (string) $decision->title,
            'employee_name' => $name,
            'employee_full_name' => $name,
            'contract_number' => (string) ($decision->contract_number ?? ''),
            'date_from' => $format($decision->date_from),
            'date_to' => $format($decision->date_to),
            'days' => $decision->days !== null ? (string) $decision->days : '',
            'leave_year' => $decision->leave_year ? (string) $decision->leave_year : '',
            'used_days' => (string) ($balance['used_days'] ?? ''),
            'remaining_days' => (string) ($balance['remaining_days'] ?? ''),
            'entitled_days' => (string) ($balance['entitled_days'] ?? ''),
            'body' => $body,
            'notes' => (string) ($decision->notes ?? ''),
            'employer_name' => (string) ($contractSettings->employer_name ?? ''),
            'sign_city' => (string) (($contractSettings->sign_city ?? '') ?: 'Sarajevo'),
            'director_name' => (string) ($contractSettings->director_name ?? ''),
            'store_name' => (string) ($decision->store_name ?? ''),
        ];
    }

    private function defaultTitle(string $kind): string
    {
        return match ($kind) {
            'annual_leave' => 'Rješenje o korištenju godišnjeg odmora',
            'unpaid_leave' => 'Rješenje o neplaćenom odsustvu',
            'employment' => 'Rješenje o zasnivanju radnog odnosa',
            'position_change' => 'Rješenje o rasporedu na radno mjesto',
            'salary_change' => 'Rješenje o plaći',
            'termination' => 'Rješenje o prestanku radnog odnosa',
            default => 'Odluka',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsArray(): array
    {
        $defaults = [
            'decision_number_prefix' => 'RJ-',
            'decision_number_next' => 1,
            'default_annual_leave_days' => 20,
            'generate_document_by_default' => true,
        ];
        $row = DB::table('hrm_decision_settings')->first();
        if (!$row) {
            return $defaults;
        }

        return [
            'decision_number_prefix' => (string) ($row->decision_number_prefix ?? ''),
            'decision_number_next' => (int) ($row->decision_number_next ?? 1),
            'default_annual_leave_days' => (int) ($row->default_annual_leave_days ?? 20),
            'generate_document_by_default' => (bool) ($row->generate_document_by_default ?? true),
        ];
    }
}
