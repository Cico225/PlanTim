<?php

namespace App\Http\Controllers\Api;

use App\Exports\KreditiZabraneExport;
use App\Http\Controllers\Controller;
use App\Imports\KreditiImport;
use App\Models\Planika\FinanceCredit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class PlanikaFinanceController extends Controller
{
    private const ZABRANA_SCAN_FOLDER = 'planika_finance_zabrana_scans';

    // ==================== KREDITI ====================

    public function getKrediti(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $query = FinanceCredit::query()->orderByDesc('issue_date')->orderByDesc('id');

        $this->applyKreditiListFilters($query, $request);

        $perPage = min(100, max(10, (int) $request->input('per_page', 25)));

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => collect($paginated->items())->map(fn (FinanceCredit $credit) => $this->formatCredit($credit))->values(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Brza pretraga po broju kredita / barkodu (mobilno skeniranje).
     */
    public function lookupKredit(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $number = trim((string) $request->input('number', $request->input('barcode', '')));
        if ($number === '') {
            return response()->json(['message' => 'Broj kredita ili barkod je obavezan.'], 422);
        }

        $credit = FinanceCredit::query()
            ->where('credit_number', $number)
            ->orWhere('barcode', $number)
            ->first();

        if (! $credit) {
            return response()->json([
                'found' => false,
                'message' => 'Kredit nije pronađen u bazi.',
            ], 404);
        }

        return response()->json([
            'found' => true,
            'credit' => $this->formatCredit($credit),
        ]);
    }

    public function getKredit(int $id)
    {
        $credit = FinanceCredit::query()->findOrFail($id);

        return response()->json($this->formatCredit($credit));
    }

    public function uploadKrediti(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Pokrenite migracije baze (planika_finance_krediti).'], 503);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls|max:20480',
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'overwrite' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            set_time_limit(600);

            $file = $request->file('file');
            $year = (int) $request->input('year');
            $month = (int) $request->input('month');

            $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            if (preg_match('/^(\d{4})[_\-](\d{1,2})$/', $baseName, $m)) {
                $year = (int) $m[1];
                $month = (int) $m[2];
            }

            $import = new KreditiImport(
                (int) $request->user()->id,
                $year,
                $month,
                $request->boolean('overwrite', false),
            );
            Excel::import($import, $file);

            return response()->json([
                'message' => 'Uvoz kredita završen',
                'import_year' => $year,
                'import_month' => $month,
                'success_count' => $import->getSuccessCount(),
                'error_count' => $import->getErrorCount(),
                'errors' => array_slice($import->getErrors(), 0, 50),
                'errors_truncated' => count($import->getErrors()) > 50,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Greška pri uvozu Excel fajla',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lista ID-jeva i zbroj iznosa za selekciju (npr. zbirna zabrana).
     */
    public function getKreditiSelection(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['count' => 0, 'total_amount' => 0, 'currency' => 'BAM', 'items' => []]);
        }

        $query = FinanceCredit::query()->orderBy('credit_number');
        $this->applyKreditiListFilters($query, $request);

        if ($request->boolean('only_paired')) {
            $this->applyPairedOnlyFilter($query);
        } elseif ($request->boolean('only_unpaired')) {
            $this->applyUnpairedOnlyFilter($query);
        }

        $rows = $query->get(['id', 'credit_number', 'amount', 'currency', 'zabrana_verified', 'registrar_number']);

        return response()->json([
            'count' => $rows->count(),
            'total_amount' => round($rows->sum(fn (FinanceCredit $r) => (float) ($r->amount ?? 0)), 2),
            'currency' => $rows->first()->currency ?? 'BAM',
            'items' => $rows->map(fn (FinanceCredit $r) => [
                'id' => $r->id,
                'credit_number' => $r->credit_number,
                'amount' => $r->amount,
                'is_paired' => $r->isPaired(),
            ])->values(),
        ]);
    }

    /**
     * Grupno uparivanje zabrana (zbirna zabrana).
     */
    public function bulkVerifyZabrana(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $validator = Validator::make($request->all(), [
            'credit_ids' => 'required_without:select_all_filtered|array|min:1',
            'credit_ids.*' => 'integer',
            'select_all_filtered' => 'nullable|boolean',
            'registrar_number' => 'required|string|max:100',
            'notes' => 'nullable|string|max:2000',
            'year' => 'nullable|integer',
            'month' => 'nullable|integer',
            'search' => 'nullable|string',
            'paired' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->boolean('select_all_filtered')) {
            $query = FinanceCredit::query();
            $this->applyKreditiListFilters($query, $request);
            $this->applyUnpairedOnlyFilter($query);
            $ids = $query->pluck('id');
        } else {
            $ids = collect($request->input('credit_ids', []))->map(fn ($id) => (int) $id)->unique()->values();
        }

        if ($ids->isEmpty()) {
            return response()->json(['message' => 'Nema neuparenih kredita za uparivanje.'], 422);
        }

        $credits = FinanceCredit::query()->whereIn('id', $ids)->get();
        $toPair = $credits->filter(fn (FinanceCredit $c) => ! $c->isPaired());
        $skipped = $credits->count() - $toPair->count();

        if ($toPair->isEmpty()) {
            return response()->json(['message' => 'Svi odabrani krediti su već upareni.'], 422);
        }

        $now = now();
        $userId = (int) $request->user()->id;
        $registrar = trim((string) $request->input('registrar_number'));
        $notes = $request->input('notes');

        DB::transaction(function () use ($toPair, $now, $userId, $registrar, $notes) {
            foreach ($toPair as $credit) {
                $credit->update([
                    'zabrana_verified' => true,
                    'zabrana_verified_at' => $now,
                    'zabrana_verified_by' => $userId,
                    'registrar_number' => $registrar,
                    'notes' => $notes,
                    'updated_by' => $userId,
                ]);
            }
        });

        $pairedAmount = round($toPair->sum(fn (FinanceCredit $c) => (float) ($c->amount ?? 0)), 2);

        return response()->json([
            'message' => 'Zabrane su uspješno uparene.',
            'paired_count' => $toPair->count(),
            'skipped_count' => $skipped,
            'paired_amount' => $pairedAmount,
            'currency' => $toPair->first()->currency ?? 'BAM',
        ]);
    }

    /**
     * Grupno vraćanje zabrana u status neupareno.
     */
    public function bulkUnpairZabrana(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $validator = Validator::make($request->all(), [
            'credit_ids' => 'required_without:select_all_filtered|array|min:1',
            'credit_ids.*' => 'integer',
            'select_all_filtered' => 'nullable|boolean',
            'year' => 'nullable|integer',
            'month' => 'nullable|integer',
            'search' => 'nullable|string',
            'paired' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->boolean('select_all_filtered')) {
            $query = FinanceCredit::query();
            $this->applyKreditiListFilters($query, $request);
            $this->applyPairedOnlyFilter($query);
            $ids = $query->pluck('id');
        } else {
            $ids = collect($request->input('credit_ids', []))->map(fn ($id) => (int) $id)->unique()->values();
        }

        if ($ids->isEmpty()) {
            return response()->json(['message' => 'Nema uparenih kredita za vraćanje.'], 422);
        }

        $credits = FinanceCredit::query()->whereIn('id', $ids)->get();
        $toUnpair = $credits->filter(fn (FinanceCredit $c) => $c->isPaired());
        $skipped = $credits->count() - $toUnpair->count();

        if ($toUnpair->isEmpty()) {
            return response()->json(['message' => 'Nijedan odabrani kredit nije uparen.'], 422);
        }

        $userId = (int) $request->user()->id;

        DB::transaction(function () use ($toUnpair, $userId) {
            foreach ($toUnpair as $credit) {
                $credit->update([
                    'zabrana_verified' => false,
                    'zabrana_verified_at' => null,
                    'zabrana_verified_by' => null,
                    'registrar_number' => null,
                    'updated_by' => $userId,
                ]);
            }
        });

        $unpairedAmount = round($toUnpair->sum(fn (FinanceCredit $c) => (float) ($c->amount ?? 0)), 2);

        return response()->json([
            'message' => 'Zabrane su vraćene u status neupareno.',
            'unpaired_count' => $toUnpair->count(),
            'skipped_count' => $skipped,
            'unpaired_amount' => $unpairedAmount,
            'currency' => $toUnpair->first()->currency ?? 'BAM',
        ]);
    }

    /**
     * Brisanje pojedinačnog kredita.
     */
    public function deleteKredit(int $id)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $credit = FinanceCredit::query()->findOrFail($id);
        $amount = round((float) ($credit->amount ?? 0), 2);
        $currency = $credit->currency ?? 'BAM';
        $creditNumber = $credit->credit_number;

        $this->deleteZabranaScanFile($credit);
        $credit->delete();

        return response()->json([
            'message' => 'Kredit je uspješno obrisan.',
            'credit_number' => $creditNumber,
            'deleted_amount' => $amount,
            'currency' => $currency,
        ]);
    }

    /**
     * Grupno brisanje odabranih kredita.
     */
    public function bulkDeleteKrediti(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $validator = Validator::make($request->all(), [
            'credit_ids' => 'required|array|min:1',
            'credit_ids.*' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ids = collect($request->input('credit_ids', []))->map(fn ($id) => (int) $id)->unique()->values();

        if ($ids->isEmpty()) {
            return response()->json(['message' => 'Nema kredita za brisanje.'], 422);
        }

        $credits = FinanceCredit::query()->whereIn('id', $ids)->get();

        if ($credits->isEmpty()) {
            return response()->json(['message' => 'Odabrani krediti nisu pronađeni.'], 404);
        }

        $deletedAmount = round($credits->sum(fn (FinanceCredit $c) => (float) ($c->amount ?? 0)), 2);
        $currency = $credits->first()->currency ?? 'BAM';

        DB::transaction(function () use ($credits) {
            foreach ($credits as $credit) {
                $this->deleteZabranaScanFile($credit);
                $credit->delete();
            }
        });

        return response()->json([
            'message' => 'Odabrani krediti su uspješno obrisani.',
            'deleted_count' => $credits->count(),
            'deleted_amount' => $deletedAmount,
            'currency' => $currency,
        ]);
    }

    /**
     * Evidentiranje ovjerene zabrane — broj registratora je obavezan.
     * Opcionalno: skenirani PDF/slika zabrane (scan).
     */
    public function verifyZabrana(Request $request, int $id)
    {
        $credit = FinanceCredit::query()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'registrar_number' => 'required|string|max:100',
            'notes' => 'nullable|string|max:2000',
            'scan' => 'nullable|file|mimes:pdf,jpeg,jpg,png,webp|max:51200',
            'scan_page' => 'nullable|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payload = [
            'zabrana_verified' => true,
            'zabrana_verified_at' => now(),
            'zabrana_verified_by' => $request->user()->id,
            'registrar_number' => trim((string) $request->input('registrar_number')),
            'notes' => $request->input('notes'),
            'updated_by' => $request->user()->id,
        ];

        if ($request->hasFile('scan') && Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_path')) {
            $this->deleteZabranaScanFile($credit);
            $file = $request->file('scan');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'pdf');
            $filename = 'credit_'.$credit->id.'_'.uniqid('scan_', true).'.'.$ext;
            $path = $file->storeAs(self::ZABRANA_SCAN_FOLDER, $filename, 'public');

            $payload['zabrana_scan_path'] = $path;
            $payload['zabrana_scan_name'] = $file->getClientOriginalName();
            $payload['zabrana_scan_mime'] = $file->getMimeType();
            $payload['zabrana_scan_size'] = $file->getSize();

            $additional = is_array($credit->additional_data) ? $credit->additional_data : [];
            if ($request->filled('scan_page')) {
                $additional['zabrana_scan_page'] = (int) $request->input('scan_page');
            }
            $payload['additional_data'] = $additional;
        }

        $credit->update($payload);

        return response()->json([
            'message' => 'Zabrana je uspješno uparena sa kreditom.',
            'credit' => $this->formatCredit($credit->fresh()),
        ]);
    }

    /**
     * Preuzimanje skenirane zabrane (PDF/slika) vezane za kredit.
     */
    public function getZabranaScan(int $id)
    {
        $credit = FinanceCredit::query()->findOrFail($id);

        if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_path')) {
            return response()->json(['message' => 'Skenovi zabrana nisu dostupni.'], 503);
        }

        $path = $credit->zabrana_scan_path;
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'Sken zabrane nije pronađen.'], 404);
        }

        $downloadName = $credit->zabrana_scan_name ?: basename($path);

        return response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => $credit->zabrana_scan_mime ?: 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$downloadName.'"',
        ]);
    }

    /**
     * Vraća uparenu zabranu u status neupareno.
     */
    public function unpairZabrana(Request $request, int $id)
    {
        $credit = FinanceCredit::query()->findOrFail($id);

        if (! $credit->isPaired()) {
            return response()->json(['message' => 'Kredit nije uparen.'], 422);
        }

        $credit->update([
            'zabrana_verified' => false,
            'zabrana_verified_at' => null,
            'zabrana_verified_by' => null,
            'registrar_number' => null,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Zabrana je vraćena u status neupareno.',
            'credit' => $this->formatCredit($credit->fresh()),
        ]);
    }

    public function exportZabrane(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json(['message' => 'Modul kredita nije inicijalizovan.'], 503);
        }

        $query = FinanceCredit::query()->orderByDesc('issue_date')->orderByDesc('id');
        $this->applyKreditiListFilters($query, $request);

        $credits = $query->get();

        $userNames = DB::table('users')
            ->whereIn('id', $credits->pluck('zabrana_verified_by')->filter()->unique())
            ->pluck('name', 'id');

        $rows = $credits->map(function (FinanceCredit $credit) use ($userNames) {
            $additional = is_array($credit->additional_data) ? $credit->additional_data : [];

            return [
                $credit->credit_number,
                $credit->issue_date?->format('d.m.y'),
                $credit->store_name,
                $credit->company_name,
                $credit->customer_name,
                $credit->amount,
                $additional['pio_filijala'] ?? '',
                $additional['status_izvora'] ?? '',
                $credit->isPaired() ? 'Uparen' : 'Neuparen',
                $credit->registrar_number,
                $credit->zabrana_verified_at?->format('d.m.Y H:i'),
                $userNames[$credit->zabrana_verified_by] ?? '',
                $credit->notes,
            ];
        });

        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', 0);
        $filename = $month >= 1 && $month <= 12
            ? sprintf('zabrane_%d_%02d.xlsx', $year, $month)
            : sprintf('zabrane_%d.xlsx', $year);

        return Excel::download(new KreditiZabraneExport($rows), $filename);
    }

    public function getKreditiReport(Request $request)
    {
        if (! $this->kreditiTableExists()) {
            return response()->json([
                'total' => 0,
                'paired' => 0,
                'unpaired' => 0,
                'by_month' => [],
            ]);
        }

        $query = FinanceCredit::query();

        if ($request->filled('year')) {
            $query->where('import_year', (int) $request->input('year'));
        }
        if ($request->filled('month')) {
            $query->where('import_month', (int) $request->input('month'));
        }

        $total = (clone $query)->count();
        $paired = (clone $query)
            ->where('zabrana_verified', true)
            ->whereNotNull('registrar_number')
            ->where('registrar_number', '!=', '')
            ->count();
        $unpaired = $total - $paired;

        $byMonth = FinanceCredit::query()
            ->select(
                'import_year',
                'import_month',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN zabrana_verified = 1 AND registrar_number IS NOT NULL AND registrar_number != "" THEN 1 ELSE 0 END) as paired')
            )
            ->when($request->filled('year'), fn ($q) => $q->where('import_year', (int) $request->input('year')))
            ->groupBy('import_year', 'import_month')
            ->orderByDesc('import_year')
            ->orderByDesc('import_month')
            ->get()
            ->map(fn ($row) => [
                'year' => (int) $row->import_year,
                'month' => (int) $row->import_month,
                'total' => (int) $row->total,
                'paired' => (int) $row->paired,
                'unpaired' => (int) $row->total - (int) $row->paired,
            ]);

        return response()->json([
            'total' => $total,
            'paired' => $paired,
            'unpaired' => $unpaired,
            'paired_percent' => $total > 0 ? round(($paired / $total) * 100, 1) : 0,
            'by_month' => $byMonth,
        ]);
    }

    private function applyKreditiListFilters($query, Request $request): void
    {
        if ($request->filled('search')) {
            $s = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($s) {
                $q->where('credit_number', 'like', $s)
                    ->orWhere('barcode', 'like', $s)
                    ->orWhere('customer_name', 'like', $s)
                    ->orWhere('company_name', 'like', $s)
                    ->orWhere('store_name', 'like', $s)
                    ->orWhere('registrar_number', 'like', $s);
            });
        }

        if ($request->filled('year')) {
            $query->where('import_year', (int) $request->input('year'));
        }
        if ($request->filled('month')) {
            $query->where('import_month', (int) $request->input('month'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issue_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('issue_date', '<=', $request->input('date_to'));
        }

        $paired = $request->input('paired');
        if ($paired === '1' || $paired === 'true') {
            $query->where('zabrana_verified', true)->whereNotNull('registrar_number')->where('registrar_number', '!=', '');
        } elseif ($paired === '0' || $paired === 'false') {
            $this->applyUnpairedOnlyFilter($query);
        }
    }

    private function applyUnpairedOnlyFilter($query): void
    {
        $query->where(function ($q) {
            $q->where('zabrana_verified', false)
                ->orWhereNull('registrar_number')
                ->orWhere('registrar_number', '');
        });
    }

    private function applyPairedOnlyFilter($query): void
    {
        $query->where('zabrana_verified', true)
            ->whereNotNull('registrar_number')
            ->where('registrar_number', '!=', '');
    }

    private function formatCredit(FinanceCredit $credit): array
    {
        $verifiedBy = null;
        if ($credit->zabrana_verified_by) {
            $user = DB::table('users')->find($credit->zabrana_verified_by);
            $verifiedBy = $user ? ($user->name ?? $user->email) : null;
        }

        $hasScan = Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_path')
            && ! empty($credit->zabrana_scan_path);

        return [
            'id' => $credit->id,
            'credit_number' => $credit->credit_number,
            'barcode' => $credit->barcode,
            'issue_date' => $credit->issue_date?->format('Y-m-d'),
            'store_name' => $credit->store_name,
            'company_name' => $credit->company_name,
            'customer_name' => $credit->customer_name,
            'amount' => $credit->amount,
            'currency' => $credit->currency,
            'import_year' => $credit->import_year,
            'import_month' => $credit->import_month,
            'additional_data' => $credit->additional_data,
            'zabrana_verified' => $credit->zabrana_verified,
            'zabrana_verified_at' => $credit->zabrana_verified_at?->toIso8601String(),
            'zabrana_verified_by_name' => $verifiedBy,
            'registrar_number' => $credit->registrar_number,
            'notes' => $credit->notes,
            'has_zabrana_scan' => $hasScan,
            'zabrana_scan_name' => $hasScan ? ($credit->zabrana_scan_name ?? null) : null,
            'zabrana_scan_url' => $hasScan ? "/api/planika/finance/krediti/{$credit->id}/zabrana-scan" : null,
            'is_paired' => $credit->isPaired(),
            'created_at' => $credit->created_at?->toIso8601String(),
            'updated_at' => $credit->updated_at?->toIso8601String(),
        ];
    }

    private function deleteZabranaScanFile(FinanceCredit $credit): void
    {
        if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_path')) {
            return;
        }

        $path = $credit->zabrana_scan_path;
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function kreditiTableExists(): bool
    {
        return Schema::hasTable('planika_finance_krediti');
    }
}
