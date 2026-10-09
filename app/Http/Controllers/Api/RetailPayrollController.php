<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RetailPayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class RetailPayrollController extends Controller
{
    private const MANAGER_ROLES = ['admin', 'super-admin', 'direktor-maloprodaje'];

    public function __construct(private RetailPayrollService $service)
    {
    }

    private function canManage($user): bool
    {
        if (!$user) {
            return false;
        }
        try {
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(self::MANAGER_ROLES)) {
                return true;
            }
            if (method_exists($user, 'hasPermissionTo') && $user->hasPermissionTo('planika.maloprodaja.payroll.manage')) {
                return true;
            }
        } catch (\Throwable $e) {
            // Permission may not exist for the guard yet.
        }

        return isset($user->role) && in_array(strtolower((string) $user->role), self::MANAGER_ROLES, true);
    }

    private function forbidden()
    {
        return response()->json(['message' => 'Nemate ovlaštenje za upravljanje obračunom plata.'], 403);
    }

    private function rowsQuery()
    {
        return DB::table('retail_payroll_rows as r')
            ->leftJoin('retail_payroll_worker_links as l', 'l.worker_key', '=', 'r.worker_key')
            ->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->select('r.*', 'l.user_id', 'u.name as user_name');
    }

    private function periodsFor($query): array
    {
        return $query->select('r.year', 'r.month')->distinct()
            ->orderByDesc('r.year')->orderByDesc('r.month')->get()
            ->map(fn ($p) => [
                'year' => (int) $p->year,
                'month' => (int) $p->month,
                'label' => (RetailPayrollService::MONTHS[(int) $p->month] ?? $p->month).' '.$p->year,
            ])->values()->all();
    }

    public function meta(Request $request)
    {
        if (!Schema::hasTable('retail_salary_categories') || !Schema::hasTable('retail_payroll_rows')) {
            return response()->json([
                'message' => 'Tabele za obračun plata nisu kreirane. Na serveru pokrenite: php artisan migrate --force',
            ], 503);
        }

        $user = $request->user();
        $canManage = $this->canManage($user);

        $ownQuery = DB::table('retail_payroll_rows as r')
            ->join('retail_payroll_worker_links as l', 'l.worker_key', '=', 'r.worker_key')
            ->where('l.user_id', $user->id);

        return response()->json([
            'can_manage' => $canManage,
            'categories' => DB::table('retail_salary_categories')->orderBy('position_type', 'desc')->orderBy('category')->get(),
            'my_periods' => $this->periodsFor($ownQuery),
            'periods' => $canManage ? $this->periodsFor(DB::table('retail_payroll_rows as r')) : [],
            'last_import' => $canManage ? DB::table('retail_payroll_imports as i')
                ->leftJoin('users as u', 'u.id', '=', 'i.uploaded_by')
                ->select('i.*', 'u.name as uploaded_by_name')
                ->orderByDesc('i.id')->first() : null,
        ]);
    }

    public function my(Request $request)
    {
        $user = $request->user();
        $query = $this->rowsQuery()->where('l.user_id', $user->id);
        if ($request->filled('year')) {
            $query->where('r.year', (int) $request->year);
        }
        if ($request->filled('month')) {
            $query->where('r.month', (int) $request->month);
        }

        return response()->json(['data' => $this->service->calculate($query->get())]);
    }

    public function summary(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer',
            'month' => 'required|integer|min:1|max:12',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Odaberite period.', 'errors' => $validator->errors()], 422);
        }

        $workers = $this->service->calculate(
            $this->rowsQuery()->where('r.year', (int) $request->year)->where('r.month', (int) $request->month)->get()
        );

        $totals = ['base_salary' => 0, 'turnover_difference' => 0, 'salary' => 0, 'stimulation' => 0, 'total' => 0, 'transport' => 0, 'total_with_transport' => 0];
        foreach ($workers as $w) {
            foreach ($totals as $k => $_) {
                $totals[$k] += $w['totals'][$k];
            }
        }

        return response()->json([
            'data' => $workers,
            'totals' => array_map(fn ($v) => round($v, 2), $totals),
            'workers_count' => count($workers),
            'unlinked_count' => count(array_filter($workers, fn ($w) => empty($w['user_id']))),
        ]);
    }

    public function upload(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:20480',
            'year' => 'required|integer|min:2000|max:2100',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Neispravni podaci za uvoz.', 'errors' => $validator->errors()], 422);
        }

        ini_set('memory_limit', '1024M');
        $file = $request->file('file');
        $year = (int) $request->year;

        try {
            $parsed = $this->service->parseFile($file->getRealPath());
        } catch (\Throwable $e) {
            Log::error('Retail payroll import parse failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Excel fajl nije moguće pročitati: '.$e->getMessage()], 422);
        }

        if (empty($parsed['rows'])) {
            return response()->json([
                'message' => 'U fajlu nije pronađen nijedan ispravan red. Provjerite da prvi red sadrži kolone "Prodavnica", "Mjesec" i "Radnik".',
                'errors' => $parsed['errors'],
            ], 422);
        }

        $now = now();
        DB::beginTransaction();
        try {
            $importId = DB::table('retail_payroll_imports')->insertGetId([
                'file_name' => $file->getClientOriginalName(),
                'year' => $year,
                'months' => json_encode($parsed['months']),
                'rows_count' => count($parsed['rows']),
                'uploaded_by' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('retail_payroll_rows')->where('year', $year)->whereIn('month', $parsed['months'])->delete();

            foreach (array_chunk($parsed['rows'], 200) as $chunk) {
                DB::table('retail_payroll_rows')->insert(array_map(fn ($row) => $row + [
                    'import_id' => $importId,
                    'year' => $year,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk));
            }

            $newLinks = 0;
            $autoLinked = 0;
            $existing = DB::table('retail_payroll_worker_links')->pluck('worker_key')->flip();
            $userIndex = null;
            foreach (collect($parsed['rows'])->unique('worker_key') as $row) {
                if (isset($existing[$row['worker_key']])) {
                    continue;
                }
                $userIndex ??= DB::table('users')->get(['id', 'name'])
                    ->groupBy(fn ($u) => RetailPayrollService::workerKey((string) $u->name));
                $matches = $userIndex->get($row['worker_key']);
                $userId = $matches && $matches->count() === 1 ? $matches->first()->id : null;
                DB::table('retail_payroll_worker_links')->insert([
                    'worker_key' => $row['worker_key'],
                    'worker_name' => $row['worker_name'],
                    'user_id' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $newLinks++;
                if ($userId) {
                    $autoLinked++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Retail payroll import failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Greška pri spremanju podataka: '.$e->getMessage()], 500);
        }

        $unlinked = DB::table('retail_payroll_worker_links')
            ->whereIn('worker_key', collect($parsed['rows'])->pluck('worker_key')->unique())
            ->whereNull('user_id')->count();

        return response()->json([
            'message' => 'Uvezeno '.count($parsed['rows']).' redova.',
            'import_id' => $importId,
            'year' => $year,
            'months' => array_map(fn ($m) => ['month' => $m, 'label' => RetailPayrollService::MONTHS[$m]], $parsed['months']),
            'rows_count' => count($parsed['rows']),
            'workers_count' => collect($parsed['rows'])->pluck('worker_key')->unique()->count(),
            'stores_count' => collect($parsed['rows'])->pluck('store_name')->unique()->count(),
            'new_workers' => $newLinks,
            'auto_linked' => $autoLinked,
            'unlinked_count' => $unlinked,
            'errors' => $parsed['errors'],
        ]);
    }

    public function deletePeriod(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer',
            'month' => 'required|integer|min:1|max:12',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Odaberite period.'], 422);
        }
        $deleted = DB::table('retail_payroll_rows')->where('year', (int) $request->year)->where('month', (int) $request->month)->delete();

        return response()->json(['message' => 'Obrisano '.$deleted.' redova.', 'deleted' => $deleted]);
    }

    public function updateCategories(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $validator = Validator::make($request->all(), [
            'categories' => 'required|array|min:1',
            'categories.*.id' => 'required|integer|exists:retail_salary_categories,id',
            'categories.*.base_salary' => 'required|numeric|min:0',
            'categories.*.label' => 'nullable|string|max:255',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Neispravni iznosi kategorija.', 'errors' => $validator->errors()], 422);
        }
        foreach ($request->categories as $c) {
            $update = ['base_salary' => round((float) $c['base_salary'], 2), 'updated_at' => now()];
            if (!empty($c['label'])) {
                $update['label'] = $c['label'];
            }
            DB::table('retail_salary_categories')->where('id', $c['id'])->update($update);
        }

        return response()->json([
            'message' => 'Kategorije su spremljene.',
            'categories' => DB::table('retail_salary_categories')->orderBy('position_type', 'desc')->orderBy('category')->get(),
        ]);
    }

    public function workerLinks(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $links = DB::table('retail_payroll_worker_links as l')
            ->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->select('l.id', 'l.worker_key', 'l.worker_name', 'l.user_id', 'u.name as user_name', 'u.email as user_email')
            ->orderByRaw('l.user_id IS NOT NULL')
            ->orderBy('l.worker_name')
            ->get();

        $stats = DB::table('retail_payroll_rows')
            ->select('worker_key', DB::raw('COUNT(*) as rows_count'), DB::raw('GROUP_CONCAT(DISTINCT store_name SEPARATOR ", ") as stores'))
            ->groupBy('worker_key')->get()->keyBy('worker_key');

        return response()->json(['data' => $links->map(function ($l) use ($stats) {
            $s = $stats->get($l->worker_key);
            $l->rows_count = $s->rows_count ?? 0;
            $l->stores = $s->stores ?? '';

            return $l;
        })]);
    }

    public function updateWorkerLink(Request $request, $id)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|integer|exists:users,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Odabrani korisnik ne postoji.'], 422);
        }
        $updated = DB::table('retail_payroll_worker_links')->where('id', $id)->update([
            'user_id' => $request->user_id,
            'updated_at' => now(),
        ]);
        if (!$updated && !DB::table('retail_payroll_worker_links')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Radnik nije pronađen.'], 404);
        }

        return response()->json(['message' => $request->user_id ? 'Radnik je povezan s korisnikom.' : 'Veza je uklonjena.']);
    }

    public function searchUsers(Request $request)
    {
        if (!$this->canManage($request->user())) {
            return $this->forbidden();
        }
        $search = trim((string) $request->get('search', ''));
        $query = DB::table('users')->select('id', 'name', 'email')->orderBy('name')->limit(30);
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        return response()->json(['data' => $query->get()]);
    }
}
