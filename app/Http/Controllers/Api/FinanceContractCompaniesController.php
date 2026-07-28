<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\ContractCompaniesImport;
use App\Support\ModulePermissionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class FinanceContractCompaniesController extends Controller
{
    private const STORAGE_FOLDER = 'planika_finance_contract_employee_lists';
    private const MODULE_NAME = 'planika.finance.ugovori';

    private function isAdmin($user): bool
    {
        return ModulePermissionHelper::isAdmin($user);
    }

    private function canView($user): bool
    {
        return ModulePermissionHelper::hasModuleAccess($user, self::MODULE_NAME)
            || ModulePermissionHelper::allows($user, self::MODULE_NAME, 'view');
    }

    private function canManage($user): bool
    {
        return ModulePermissionHelper::allows($user, self::MODULE_NAME, 'manage');
    }

    private function ensureView(Request $request)
    {
        if (!$this->canView($request->user())) {
            return response()->json(['message' => 'Nemate dozvolu za pregled modula.'], 403);
        }

        return null;
    }

    private function ensureManage(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return response()->json(['message' => 'Nemate dozvolu za administraciju modula.'], 403);
        }

        return null;
    }

    private function ensureImport(Request $request)
    {
        $user = $request->user();
        if (!$this->canManage($user) && !ModulePermissionHelper::allows($user, self::MODULE_NAME, 'import')) {
            return response()->json(['message' => 'Nemate dozvolu za uvoz podataka.'], 403);
        }

        return null;
    }

    private function tablesExist(): bool
    {
        return Schema::hasTable('planika_finance_contract_companies');
    }

    private function formatCompany($row): array
    {
        $data = (array) $row;
        $lists = DB::table('planika_finance_contract_employee_lists')
            ->where('company_id', $data['id'])
            ->orderByDesc('created_at')
            ->get();

        $data['employee_lists'] = $lists->map(function ($list) use ($data) {
            $item = (array) $list;
            $item['download_url'] = "/api/planika/finance/contract-companies/{$data['id']}/employee-lists/{$list->id}";

            return $item;
        })->values()->all();

        $data['employee_lists_count'] = count($data['employee_lists']);

        return $data;
    }

    public function capabilities(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'can_view' => $this->canView($user),
            'can_manage' => $this->canManage($user),
            'can_import' => $this->canManage($user) || ModulePermissionHelper::allows($user, self::MODULE_NAME, 'import'),
        ]);
    }

    public function index(Request $request)
    {
        if ($response = $this->ensureView($request)) {
            return $response;
        }

        if (!$this->tablesExist()) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $query = DB::table('planika_finance_contract_companies as c')
            ->leftJoin('users as u', 'u.id', '=', 'c.created_by')
            ->select('c.*', 'u.name as created_by_name');

        if ($request->filled('city')) {
            $query->where('c.city', $request->city);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('c.name', 'like', $search)
                    ->orWhere('c.code', 'like', $search)
                    ->orWhere('c.city', 'like', $search)
                    ->orWhere('c.notes', 'like', $search);
            });
        }

        $companies = $query->orderBy('c.name')->get()->map(fn ($row) => $this->formatCompany($row));

        $cities = DB::table('planika_finance_contract_companies')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return response()->json([
            'data' => $companies,
            'total' => $companies->count(),
            'cities' => $cities,
        ]);
    }

    public function show(Request $request, $id)
    {
        if ($response = $this->ensureView($request)) {
            return $response;
        }

        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $company = DB::table('planika_finance_contract_companies as c')
            ->leftJoin('users as u', 'u.id', '=', 'c.created_by')
            ->select('c.*', 'u.name as created_by_name')
            ->where('c.id', $id)
            ->first();

        if (!$company) {
            return response()->json(['error' => 'Firma nije pronađena'], 404);
        }

        return response()->json($this->formatCompany($company));
    }

    public function store(Request $request)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        if ($response = $this->ensureManage($request)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:100|unique:planika_finance_contract_companies,code',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $id = DB::table('planika_finance_contract_companies')->insertGetId([
            'name' => $data['name'],
            'code' => $data['code'],
            'city' => $data['city'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->formatCompany(
            DB::table('planika_finance_contract_companies')->where('id', $id)->first()
        ), 201);
    }

    public function update(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        if ($response = $this->ensureManage($request)) {
            return $response;
        }

        $company = DB::table('planika_finance_contract_companies')->where('id', $id)->first();
        if (!$company) {
            return response()->json(['error' => 'Firma nije pronađena'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:100|unique:planika_finance_contract_companies,code,' . $id,
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        DB::table('planika_finance_contract_companies')->where('id', $id)->update([
            'name' => $data['name'],
            'code' => $data['code'],
            'city' => $data['city'] ?? null,
            'notes' => $data['notes'] ?? null,
            'updated_at' => now(),
        ]);

        return response()->json($this->formatCompany(
            DB::table('planika_finance_contract_companies')->where('id', $id)->first()
        ));
    }

    public function destroy(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        if ($response = $this->ensureManage($request)) {
            return $response;
        }

        $company = DB::table('planika_finance_contract_companies')->where('id', $id)->first();
        if (!$company) {
            return response()->json(['error' => 'Firma nije pronađena'], 404);
        }

        $lists = DB::table('planika_finance_contract_employee_lists')->where('company_id', $id)->get();
        foreach ($lists as $list) {
            if (Storage::disk('public')->exists($list->file_path)) {
                Storage::disk('public')->delete($list->file_path);
            }
        }

        DB::table('planika_finance_contract_companies')->where('id', $id)->delete();

        return response()->json(['message' => 'Firma je obrisana']);
    }

    public function uploadExcel(Request $request)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        if ($response = $this->ensureImport($request)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $import = new ContractCompaniesImport((int) $request->user()->id);
            Excel::import($import, $request->file('file'));

            return response()->json([
                'message' => 'Uvoz firmi završen',
                'success_count' => $import->getSuccessCount(),
                'updated_count' => $import->getUpdatedCount(),
                'error_count' => $import->getErrorCount(),
                'errors' => array_slice($import->getErrors(), 0, 50),
            ]);
        } catch (\Throwable $e) {
            Log::error('Contract companies import failed', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Greška pri uvozu Excel fajla',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function uploadEmployeeList(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        if ($response = $this->ensureManage($request)) {
            return $response;
        }

        $company = DB::table('planika_finance_contract_companies')->where('id', $id)->first();
        if (!$company) {
            return response()->json(['error' => 'Firma nije pronađena'], 404);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpeg,jpg,png,webp,pdf|max:51200',
            'title' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $mime = $file->getMimeType();
        $fileType = str_starts_with($mime, 'image/') ? 'image' : 'pdf';
        $filename = uniqid('emp_list_', true) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs(self::STORAGE_FOLDER, $filename, 'public');

        $listId = DB::table('planika_finance_contract_employee_lists')->insertGetId([
            'company_id' => $id,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $fileType,
            'mime_type' => $mime,
            'file_size' => $file->getSize(),
            'title' => $request->input('title'),
            'uploaded_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $list = DB::table('planika_finance_contract_employee_lists')->where('id', $listId)->first();

        return response()->json([
            'message' => 'Spisak uposlenika je učitan',
            'list' => [
                ...(array) $list,
                'download_url' => "/api/planika/finance/contract-companies/{$id}/employee-lists/{$listId}",
            ],
            'company' => $this->formatCompany($company),
        ], 201);
    }

    public function getEmployeeList(Request $request, $companyId, $listId)
    {
        if ($response = $this->ensureView($request)) {
            return $response;
        }

        $list = DB::table('planika_finance_contract_employee_lists')
            ->where('id', $listId)
            ->where('company_id', $companyId)
            ->first();

        if (!$list || !Storage::disk('public')->exists($list->file_path)) {
            return response()->json(['error' => 'Dokument nije pronađen'], 404);
        }

        return response()->file(Storage::disk('public')->path($list->file_path), [
            'Content-Type' => $list->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . $list->file_name . '"',
        ]);
    }

    public function deleteEmployeeList(Request $request, $companyId, $listId)
    {
        if ($response = $this->ensureManage($request)) {
            return $response;
        }

        $list = DB::table('planika_finance_contract_employee_lists')
            ->where('id', $listId)
            ->where('company_id', $companyId)
            ->first();

        if (!$list) {
            return response()->json(['error' => 'Dokument nije pronađen'], 404);
        }

        if (Storage::disk('public')->exists($list->file_path)) {
            Storage::disk('public')->delete($list->file_path);
        }

        DB::table('planika_finance_contract_employee_lists')->where('id', $listId)->delete();

        return response()->json(['message' => 'Spisak uposlenika je obrisan']);
    }
}
