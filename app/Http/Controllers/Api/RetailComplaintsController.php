<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\UploadedFile;

class RetailComplaintsController extends Controller
{
    private const STORAGE_FOLDER = 'planika_maloprodaja_complaints';

    private function isAdmin($user): bool
    {
        if (method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole(['admin', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }

        return isset($user->role) && in_array(strtolower($user->role), ['admin', 'super-admin']);
    }

    private function canReview($user): bool
    {
        return $this->isAdmin($user)
            || (method_exists($user, 'can') && $user->can('planika.maloprodaja.complaints.review'));
    }

    private function canViewAll($user): bool
    {
        return $this->canReview($user)
            || (method_exists($user, 'can') && $user->can('planika.maloprodaja.complaints.view_all'));
    }

    private function canCreate($user): bool
    {
        return $this->isAdmin($user)
            || (method_exists($user, 'can') && $user->can('planika.maloprodaja.complaints.create'));
    }

    private function getEmployeeStoreId($user): ?int
    {
        $employee = DB::table('hrm_employees')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$employee || !$employee->store) {
            $managedStore = DB::table('hrm_stores')
                ->where('store_manager_id', $user->id)
                ->where('is_active', true)
                ->value('id');

            return $managedStore ? (int) $managedStore : null;
        }

        $store = DB::table('hrm_stores')
            ->where(function ($query) use ($employee) {
                $query->where('name', $employee->store)
                    ->orWhere('code', $employee->store)
                    ->orWhere('name', 'like', '%' . $employee->store . '%');
            })
            ->where('is_active', true)
            ->first();

        return $store ? (int) $store->id : null;
    }

    private function resolveStoreId(Request $request, $user): ?int
    {
        if ($request->filled('store_id')) {
            $storeId = (int) $request->input('store_id');
            $exists = DB::table('hrm_stores')->where('id', $storeId)->where('is_active', true)->exists();

            return $exists ? $storeId : null;
        }

        return $this->getEmployeeStoreId($user);
    }

    private function tablesExist(): bool
    {
        return Schema::hasTable('planika_maloprodaja_complaints');
    }

    private function generateComplaintNumber(): string
    {
        $year = date('Y');
        $count = DB::table('planika_maloprodaja_complaints')
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('RC-%s-%05d', $year, $count);
    }

    private function formatComplaint($row): array
    {
        $data = (array) $row;
        for ($i = 1; $i <= 4; $i++) {
            $pathKey = "photo_{$i}_path";
            if (!empty($data[$pathKey])) {
            $data["photo_{$i}_url"] = "/api/planika/maloprodaja/complaints/{$data['id']}/photos/{$i}";
            }
        }

        return $data;
    }

    private function storeUploadedImage(UploadedFile $file): array
    {
        if (function_exists('imagecreatefromstring') && function_exists('imagejpeg')) {
            try {
                return $this->optimizeWithGd($file);
            } catch (\Throwable $e) {
                Log::warning('GD optimization failed, storing original file', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $extension = 'jpg';
        }

        $filename = uniqid('complaint_', true) . '.' . $extension;
        $path = $file->storeAs(self::STORAGE_FOLDER, $filename, 'public');

        return [
            'path' => $path,
            'size' => Storage::disk('public')->size($path),
        ];
    }

    private function optimizeWithGd(UploadedFile $file): array
    {
        $maxWidth = 1920;
        $quality = 82;
        $content = file_get_contents($file->getRealPath());
        $image = @imagecreatefromstring($content);

        if (!$image) {
            throw new \RuntimeException('Neispravna slika.');
        }

        $width = imagesx($image);
        $height = imagesy($image);

        if ($width > $maxWidth) {
            $newHeight = (int) round($height * ($maxWidth / $width));
            $resized = imagecreatetruecolor($maxWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $maxWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        $filename = uniqid('complaint_', true) . '.jpg';
        $relativePath = self::STORAGE_FOLDER . '/' . $filename;
        $directory = Storage::disk('public')->path(self::STORAGE_FOLDER);

        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $fullPath = Storage::disk('public')->path($relativePath);
        imagejpeg($image, $fullPath, $quality);
        imagedestroy($image);

        return [
            'path' => $relativePath,
            'size' => filesize($fullPath),
        ];
    }

    private function deletePhotoFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    public function capabilities(Request $request)
    {
        $user = $request->user();

        $storeId = $this->getEmployeeStoreId($user);
        $requiresStoreSelection = $this->canViewAll($user) && !$storeId;
        $stores = [];

        if ($requiresStoreSelection) {
            $stores = DB::table('hrm_stores')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return response()->json([
            'can_create' => $this->canCreate($user),
            'can_review' => $this->canReview($user),
            'can_view_all' => $this->canViewAll($user),
            'store_id' => $storeId,
            'requires_store_selection' => $requiresStoreSelection,
            'stores' => $stores,
        ]);
    }

    public function index(Request $request)
    {
        if (!$this->tablesExist()) {
            return response()->json([]);
        }

        $user = $request->user();
        $query = DB::table('planika_maloprodaja_complaints as c')
            ->leftJoin('hrm_stores as s', 's.id', '=', 'c.store_id')
            ->leftJoin('users as u', 'u.id', '=', 'c.created_by')
            ->select(
                'c.*',
                's.name as store_name',
                'u.name as created_by_name'
            )
            ->orderByDesc('c.created_at');

        if (!$this->canViewAll($user)) {
            $storeId = $this->getEmployeeStoreId($user);
            if (!$storeId) {
                return response()->json([]);
            }
            $query->where('c.store_id', $storeId);
        }

        if ($request->filled('status')) {
            $query->where('c.status', $request->status);
        }

        if ($request->filled('store_id') && $this->canViewAll($user)) {
            $query->where('c.store_id', $request->store_id);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('c.complaint_number', 'like', $search)
                    ->orWhere('c.customer_name', 'like', $search)
                    ->orWhere('c.article_code', 'like', $search)
                    ->orWhere('c.receipt_number', 'like', $search);
            });
        }

        $complaints = $query->get()->map(fn ($row) => $this->formatComplaint($row));

        return response()->json($complaints);
    }

    public function show(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $complaint = $this->findComplaintOrFail($request, $id);
        return response()->json($this->formatComplaint($complaint));
    }

    public function store(Request $request)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $user = $request->user();
        if (!$this->canCreate($user)) {
            return response()->json(['error' => 'Nemate dozvolu za unos reklamacija'], 403);
        }

        $storeId = $this->resolveStoreId($request, $user);
        if (!$storeId) {
            return response()->json(['error' => 'Odaberite prodavnicu ili provjerite HRM vezu korisnika sa prodavnicom.'], 422);
        }

        if (!$this->canViewAll($user) && $storeId != $this->getEmployeeStoreId($user)) {
            return response()->json(['error' => 'Možete unositi reklamacije samo za svoju prodavnicu'], 403);
        }

        $validator = Validator::make($request->all(), $this->complaintFieldRules());

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->boolean('finalize')) {
            return response()->json([
                'errors' => ['photos' => ['Potrebna je barem jedna fotografija artikla.']],
            ], 422);
        }

        $id = DB::table('planika_maloprodaja_complaints')->insertGetId([
            'complaint_number' => $this->generateComplaintNumber(),
            'store_id' => $storeId,
            'created_by' => $user->id,
            'customer_name' => $data['customer_name'],
            'customer_address' => $data['customer_address'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'customer_city' => $data['customer_city'] ?? null,
            'customer_email' => $data['customer_email'] ?? null,
            'article_code' => $data['article_code'] ?? null,
            'article_price' => $data['article_price'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'receipt_number' => $data['receipt_number'] ?? null,
            'purchase_date' => $data['purchase_date'] ?? null,
            'defect_description' => $data['defect_description'] ?? null,
            'status' => 'zaprimljena',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $complaint = $this->findComplaintOrFail($request, $id, true);
        return response()->json($this->formatComplaint($complaint), 201);
    }

    public function update(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $user = $request->user();
        $complaint = $this->findComplaintOrFail($request, $id, true);

        $canUpdate = $this->canReview($user)
            || (
                $this->canCreate($user)
                && (int) $complaint->store_id === (int) $this->getEmployeeStoreId($user)
                && in_array($complaint->status, ['zaprimljena', 'ponovo_uslikati'], true)
            );

        if (!$canUpdate) {
            return response()->json(['error' => 'Nemate dozvolu za izmjenu reklamacije'], 403);
        }

        $validator = Validator::make($request->all(), $this->complaintFieldRules());

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->boolean('finalize') && !$this->hasAtLeastOnePhoto($complaint)) {
            return response()->json(['errors' => ['photos' => ['Potrebna je barem jedna fotografija artikla.']]], 422);
        }

        DB::table('planika_maloprodaja_complaints')->where('id', $id)->update([
            'customer_name' => $data['customer_name'],
            'customer_address' => $data['customer_address'],
            'customer_phone' => $data['customer_phone'],
            'customer_city' => $data['customer_city'],
            'customer_email' => $data['customer_email'] ?? null,
            'article_code' => $data['article_code'],
            'article_price' => $data['article_price'],
            'payment_method' => $data['payment_method'],
            'receipt_number' => $data['receipt_number'] ?? null,
            'purchase_date' => $data['purchase_date'],
            'defect_description' => $data['defect_description'],
            'updated_at' => now(),
        ]);

        $fresh = $this->findComplaintOrFail($request, $id, true);
        return response()->json($this->formatComplaint($fresh));
    }

    public function uploadPhoto(Request $request, $id, $slot)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $slot = (int) $slot;
        if ($slot < 1 || $slot > 4) {
            return response()->json(['error' => 'Neispravan slot za fotografiju'], 422);
        }

        $user = $request->user();
        $complaint = $this->findComplaintOrFail($request, $id, true);

        $canUpload = $this->canReview($user)
            || (
                $this->canCreate($user)
                && (int) $complaint->store_id === (int) $this->getEmployeeStoreId($user)
                && in_array($complaint->status, ['zaprimljena', 'ponovo_uslikati'], true)
            );

        if (!$canUpload) {
            return response()->json(['error' => 'Nemate dozvolu za upload fotografije'], 403);
        }

        $validator = Validator::make($request->all(), [
            'photo' => 'required|image|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $stored = $this->storeUploadedImage($request->file('photo'));
            $pathKey = "photo_{$slot}_path";
            $sizeKey = "photo_{$slot}_size";

            $this->deletePhotoFile($complaint->{$pathKey} ?? null);

            $update = [
                $pathKey => $stored['path'],
                $sizeKey => $stored['size'],
                'updated_at' => now(),
            ];

            if (!$this->canReview($user) && $complaint->status === 'ponovo_uslikati') {
                $update['status'] = 'zaprimljena';
                $update['admin_comment'] = null;
            }

            DB::table('planika_maloprodaja_complaints')->where('id', $id)->update($update);

            $fresh = $this->findComplaintOrFail($request, $id, true);
            return response()->json($this->formatComplaint($fresh));
        } catch (\Throwable $e) {
            Log::error('Complaint photo upload failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Greška pri uploadu fotografije: ' . $e->getMessage()], 500);
        }
    }

    public function getPhoto(Request $request, $id, $slot)
    {
        $slot = (int) $slot;
        if ($slot < 1 || $slot > 4) {
            return response()->json(['error' => 'Neispravan slot'], 422);
        }

        $complaint = $this->findComplaintOrFail($request, $id, true);
        $pathKey = "photo_{$slot}_path";
        $path = $complaint->{$pathKey} ?? null;

        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json(['error' => 'Fotografija nije pronađena'], 404);
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/jpeg',
        };

        return response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function review(Request $request, $id)
    {
        if (!$this->tablesExist()) {
            return response()->json(['error' => 'Modul nije dostupan'], 503);
        }

        $user = $request->user();
        if (!$this->canReview($user)) {
            return response()->json(['error' => 'Nemate dozvolu za obradu reklamacija'], 403);
        }

        $complaint = $this->findComplaintOrFail($request, $id, true);

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:ponovo_uslikati,odbijena,opravdana',
            'admin_comment' => 'required_if:action,ponovo_uslikati|nullable|string',
            'admin_response' => 'required_if:action,odbijena,opravdana|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $status = $data['action'];

        DB::table('planika_maloprodaja_complaints')->where('id', $id)->update([
            'status' => $status,
            'admin_comment' => $status === 'ponovo_uslikati' ? ($data['admin_comment'] ?? null) : null,
            'admin_response' => in_array($status, ['odbijena', 'opravdana'], true)
                ? ($data['admin_response'] ?? null)
                : null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'updated_at' => now(),
        ]);

        $fresh = $this->findComplaintOrFail($request, $id, true);
        return response()->json($this->formatComplaint($fresh));
    }

    private function findComplaintOrFail(Request $request, $id, bool $skipStoreCheck = false)
    {
        $complaint = DB::table('planika_maloprodaja_complaints as c')
            ->leftJoin('hrm_stores as s', 's.id', '=', 'c.store_id')
            ->leftJoin('users as u', 'u.id', '=', 'c.created_by')
            ->leftJoin('users as r', 'r.id', '=', 'c.reviewed_by')
            ->select(
                'c.*',
                's.name as store_name',
                'u.name as created_by_name',
                'r.name as reviewed_by_name'
            )
            ->where('c.id', $id)
            ->first();

        if (!$complaint) {
            abort(404, 'Reklamacija nije pronađena');
        }

        if (!$skipStoreCheck && !$this->canViewAll($request->user())) {
            $storeId = $this->getEmployeeStoreId($request->user());
            if (!$storeId || (int) $complaint->store_id !== (int) $storeId) {
                abort(403, 'Nemate pristup ovoj reklamaciji');
            }
        }

        return $complaint;
    }

    private function complaintFieldRules(): array
    {
        return [
            'customer_name' => 'required|string|max:255',
            'customer_address' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:50',
            'customer_city' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'article_code' => 'required|string|max:100',
            'article_price' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'receipt_number' => 'nullable|string|max:100',
            'purchase_date' => 'required|date',
            'defect_description' => 'required|string',
        ];
    }

    private function hasAtLeastOnePhoto(object $complaint): bool
    {
        for ($i = 1; $i <= 4; $i++) {
            $key = "photo_{$i}_path";
            if (!empty($complaint->{$key})) {
                return true;
            }
        }

        return false;
    }
}
