<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class GDPRController extends Controller
{
    /**
     * Get user consent records
     */
    public function getConsents(Request $request)
    {
        $consents = DB::table('gdpr_consents')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($consents);
    }

    /**
     * Give or withdraw consent
     */
    public function updateConsent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'consent_type' => 'required|string|max:255',
            'consent_text' => 'required|string',
            'is_given' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = [
            'user_id' => $request->user()->id,
            'consent_type' => $request->input('consent_type'),
            'consent_text' => $request->input('consent_text'),
            'is_given' => $request->input('is_given'),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($request->input('is_given')) {
            $data['given_at'] = now();
            $data['withdrawn_at'] = null;
        } else {
            $data['withdrawn_at'] = now();
        }

        $consentId = DB::table('gdpr_consents')->insertGetId($data);
        $consent = DB::table('gdpr_consents')->find($consentId);

        return response()->json($consent, 201);
    }

    /**
     * Request data export
     */
    public function requestDataExport(Request $request)
    {
        $userId = $request->user()->id;

        // Check if there's a pending request
        $pending = DB::table('gdpr_data_requests')
            ->where('user_id', $userId)
            ->where('type', 'export')
            ->where('status', 'pending')
            ->first();

        if ($pending) {
            return response()->json([
                'message' => 'You already have a pending data export request',
                'request' => $pending,
            ], 422);
        }

        $requestId = DB::table('gdpr_data_requests')->insertGetId([
            'user_id' => $userId,
            'type' => 'export',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $exportRequest = DB::table('gdpr_data_requests')->find($requestId);

        // TODO: Trigger background job to process data export

        return response()->json([
            'message' => 'Data export request submitted successfully',
            'request' => $exportRequest,
        ], 201);
    }

    /**
     * Get data export requests
     */
    public function getDataExports(Request $request)
    {
        $exports = DB::table('gdpr_data_requests')
            ->where('user_id', $request->user()->id)
            ->where('type', 'export')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($exports);
    }

    /**
     * Download data export
     */
    public function downloadDataExport($id, Request $request)
    {
        $export = DB::table('gdpr_data_requests')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->where('type', 'export')
            ->first();

        if (!$export) {
            return response()->json(['message' => 'Export request not found'], 404);
        }

        if ($export->status !== 'completed') {
            return response()->json(['message' => 'Export is not ready yet'], 422);
        }

        if (!$export->file_path) {
            return response()->json(['message' => 'Export file not found'], 404);
        }

        // Return download URL or file
        return response()->json([
            'download_url' => $export->file_path,
        ]);
    }

    /**
     * Request data deletion
     */
    public function requestDataDeletion(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = $request->user()->id;

        // Check if there's a pending request
        $pending = DB::table('gdpr_data_requests')
            ->where('user_id', $userId)
            ->where('type', 'deletion')
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($pending) {
            return response()->json([
                'message' => 'You already have a pending data deletion request',
                'request' => $pending,
            ], 422);
        }

        $requestId = DB::table('gdpr_data_requests')->insertGetId([
            'user_id' => $userId,
            'type' => 'deletion',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deletionRequest = DB::table('gdpr_data_requests')->find($requestId);

        return response()->json([
            'message' => 'Data deletion request submitted successfully. An administrator will review your request.',
            'request' => $deletionRequest,
        ], 201);
    }

    /**
     * Get data deletion requests
     */
    public function getDataDeletions(Request $request)
    {
        $deletions = DB::table('gdpr_data_requests')
            ->where('user_id', $request->user()->id)
            ->where('type', 'deletion')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($deletions);
    }

    /**
     * Get audit log
     * Uses activity_log table for GDPR audit trail
     */
    public function getAuditLog(Request $request)
    {
        $logs = DB::table('activity_log')
            ->where('causer_id', $request->user()->id)
            ->where('causer_type', 'App\\Models\\User')
            ->where(function ($query) {
                $query->where('description', 'like', '%GDPR%')
                      ->orWhere('description', 'like', '%consent%')
                      ->orWhere('description', 'like', '%export%')
                      ->orWhere('description', 'like', '%deletion%');
            })
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    // ==================== ADMIN METHODS ====================

    /**
     * Get all consents (Admin only)
     */
    public function getAllConsents(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = DB::table('gdpr_consents')
            ->select(
                'gdpr_consents.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->leftJoin('users', 'gdpr_consents.user_id', '=', 'users.id')
            ->orderBy('gdpr_consents.created_at', 'desc');

        // Filters
        if ($request->has('user_id')) {
            $query->where('gdpr_consents.user_id', $request->input('user_id'));
        }

        if ($request->has('type')) {
            $query->where('gdpr_consents.type', $request->input('type'));
        }

        if ($request->has('accepted')) {
            $query->where('gdpr_consents.accepted', $request->input('accepted'));
        }

        $consents = $query->paginate(50);

        return response()->json($consents);
    }

    /**
     * Get all data export requests (Admin only)
     */
    public function getAllDataExports(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = DB::table('gdpr_data_requests')
            ->select(
                'gdpr_data_requests.*',
                'users.name as user_name',
                'users.email as user_email',
                'processed_by_user.name as processed_by_name'
            )
            ->leftJoin('users', 'gdpr_data_requests.user_id', '=', 'users.id')
            ->leftJoin('users as processed_by_user', 'gdpr_data_requests.processed_by', '=', 'processed_by_user.id')
            ->where('gdpr_data_requests.type', 'export')
            ->orderBy('gdpr_data_requests.created_at', 'desc');

        // Filters
        if ($request->has('status')) {
            $query->where('gdpr_data_requests.status', $request->input('status'));
        }

        if ($request->has('user_id')) {
            $query->where('gdpr_data_requests.user_id', $request->input('user_id'));
        }

        $exports = $query->paginate(50);

        return response()->json($exports);
    }

    /**
     * Process data export request (Admin only)
     */
    public function processDataExport(Request $request, $id)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,completed,rejected',
            'file_path' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $exportRequest = DB::table('gdpr_data_requests')
            ->where('id', $id)
            ->where('type', 'export')
            ->first();

        if (!$exportRequest) {
            return response()->json(['message' => 'Export request not found'], 404);
        }

        DB::table('gdpr_data_requests')
            ->where('id', $id)
            ->update([
                'status' => $request->input('status'),
                'processed_by' => $user->id,
                'processed_at' => now(),
                'file_path' => $request->input('file_path'),
                'updated_at' => now(),
            ]);

        // Log activity
        activity()
            ->causedBy($user)
            ->log('GDPR data export request processed: ' . $id);

        return response()->json([
            'message' => 'Export request processed successfully',
        ]);
    }

    /**
     * Get all data deletion requests (Admin only)
     */
    public function getAllDataDeletions(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = DB::table('gdpr_data_requests')
            ->select(
                'gdpr_data_requests.*',
                'users.name as user_name',
                'users.email as user_email',
                'processed_by_user.name as processed_by_name'
            )
            ->leftJoin('users', 'gdpr_data_requests.user_id', '=', 'users.id')
            ->leftJoin('users as processed_by_user', 'gdpr_data_requests.processed_by', '=', 'processed_by_user.id')
            ->where('gdpr_data_requests.type', 'deletion')
            ->orderBy('gdpr_data_requests.created_at', 'desc');

        // Filters
        if ($request->has('status')) {
            $query->where('gdpr_data_requests.status', $request->input('status'));
        }

        if ($request->has('user_id')) {
            $query->where('gdpr_data_requests.user_id', $request->input('user_id'));
        }

        $deletions = $query->paginate(50);

        return response()->json($deletions);
    }

    /**
     * Process data deletion request (Admin only)
     */
    public function processDataDeletion(Request $request, $id)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,approved,rejected,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $deletionRequest = DB::table('gdpr_data_requests')
            ->where('id', $id)
            ->where('type', 'deletion')
            ->first();

        if (!$deletionRequest) {
            return response()->json(['message' => 'Deletion request not found'], 404);
        }

        $status = $request->input('status');

        DB::table('gdpr_data_requests')
            ->where('id', $id)
            ->update([
                'status' => $status,
                'processed_by' => $user->id,
                'processed_at' => now(),
                'updated_at' => now(),
            ]);

        // If approved, trigger data deletion (should be done via queue/job)
        if ($status === 'approved') {
            // TODO: Queue job to delete user data
            // This should anonymize or delete all user data across all modules
        }

        // Log activity
        activity()
            ->causedBy($user)
            ->log('GDPR data deletion request processed: ' . $id . ' - Status: ' . $status);

        return response()->json([
            'message' => 'Deletion request processed successfully',
        ]);
    }

    /**
     * Get GDPR statistics (Admin only)
     */
    public function getGDPRStats()
    {
        // Check admin access
        $user = request()->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $stats = [
            'total_consents' => DB::table('gdpr_consents')->count(),
            'active_consents' => DB::table('gdpr_consents')->where('accepted', true)->count(),
            'revoked_consents' => DB::table('gdpr_consents')->whereNotNull('revoked_at')->count(),
            'pending_exports' => DB::table('gdpr_data_requests')
                ->where('type', 'export')
                ->where('status', 'pending')
                ->count(),
            'pending_deletions' => DB::table('gdpr_data_requests')
                ->where('type', 'deletion')
                ->where('status', 'pending')
                ->count(),
            'completed_exports' => DB::table('gdpr_data_requests')
                ->where('type', 'export')
                ->where('status', 'completed')
                ->count(),
            'completed_deletions' => DB::table('gdpr_data_requests')
                ->where('type', 'deletion')
                ->where('status', 'completed')
                ->count(),
        ];

        return response()->json($stats);
    }
}

