<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class RetailControlRecordsController extends Controller
{
    /**
     * Get all control records with filters
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('retail_control_records')
                ->select('retail_control_records.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) as store_code')
                ->orderBy('retail_control_records.control_date_from', 'desc');

            if ($request->has('store_id')) {
                $query->where('retail_control_records.store_id', $request->store_id);
            }

            if ($request->has('control_type') && $request->control_type !== 'all') {
                $query->where('retail_control_records.control_type', $request->control_type);
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('retail_control_records.status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->where('retail_control_records.control_date_from', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('retail_control_records.control_date_from', '<=', $request->date_to);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->whereRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) LIKE ?', ["%{$search}%"]);
                });
            }

            $records = $query->paginate($request->get('per_page', 20));

            return response()->json($records);
        } catch (\Exception $e) {
            Log::error('Error fetching control records', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch control records'], 500);
        }
    }

    /**
     * Get single control record with all related data
     */
    public function show($id)
    {
        try {
            $record = DB::table('retail_control_records')
                ->select('retail_control_records.*')
                ->selectRaw('(SELECT name FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) as store_name')
                ->selectRaw('(SELECT code FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) as store_code')
                ->selectRaw('(SELECT CONCAT_WS(", ", city, address) FROM hrm_stores WHERE hrm_stores.id = retail_control_records.store_id) as store_location_full')
                ->where('retail_control_records.id', $id)
                ->first();

            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            // Load participants
            $record->participants = DB::table('retail_control_participants')
                ->select('retail_control_participants.*', 'users.name as user_name', 'users.email as user_email')
                ->leftJoin('users', 'retail_control_participants.user_id', '=', 'users.id')
                ->where('retail_control_participants.control_record_id', $id)
                ->get();

            // Load present persons
            $record->present_persons = DB::table('retail_control_present_persons')
                ->select('retail_control_present_persons.*', 'users.name as employee_name', 'users.email as employee_email')
                ->leftJoin('hrm_employees', 'retail_control_present_persons.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('retail_control_present_persons.control_record_id', $id)
                ->get();

            // Load inventory items (if total inventory)
            if ($record->control_type === 'total_inventory') {
                $record->inventory_items = DB::table('retail_inventory_items')
                    ->where('control_record_id', $id)
                    ->get();
            }

            // Load observations (if inspection)
            if ($record->control_type === 'inspection') {
                $record->observations = DB::table('retail_control_observations')
                    ->where('control_record_id', $id)
                    ->orderBy('category')
                    ->orderBy('item')
                    ->get();
            }

            // Load measures
            $record->measures = DB::table('retail_control_measures')
                ->select('retail_control_measures.*', 'users.name as responsible_user_name')
                ->leftJoin('users', 'retail_control_measures.responsible_user_id', '=', 'users.id')
                ->where('retail_control_measures.control_record_id', $id)
                ->get();

            // Load attachments
            $attachments = DB::table('retail_control_attachments')
                ->where('control_record_id', $id)
                ->get();
            
            // Add file_url for each attachment (use API endpoint)
            foreach ($attachments as $attachment) {
                $attachment->file_url = '/api/retail/control-records/' . $id . '/attachments/' . $attachment->id;
            }
            
            $record->attachments = $attachments;

            // Load signatures
            $record->signatures = DB::table('retail_control_signatures')
                ->select('retail_control_signatures.*', 'users.name as user_name')
                ->leftJoin('users', 'retail_control_signatures.user_id', '=', 'users.id')
                ->where('retail_control_signatures.control_record_id', $id)
                ->get();

            return response()->json($record);
        } catch (\Exception $e) {
            Log::error('Error fetching control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch control record'], 500);
        }
    }

    /**
     * Create new control record
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'store_id' => 'required|exists:hrm_stores,id',
                'control_type' => 'required|in:total_inventory,inspection',
                'control_date_from' => 'required|date',
                'control_date_to' => 'nullable|date|after_or_equal:control_date_from',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $store = DB::table('hrm_stores')->where('id', $request->store_id)->first();
            
            if (!$store) {
                return response()->json(['error' => 'Store not found'], 404);
            }
            
            DB::beginTransaction();

            // Build store location from city and address
            $storeLocation = null;
            if ($store->city || $store->address) {
                $parts = array_filter([$store->city, $store->address]);
                $storeLocation = implode(', ', $parts);
            }

            $recordId = DB::table('retail_control_records')->insertGetId([
                'store_id' => $request->store_id,
                'plan_item_id' => $request->plan_item_id ?? null,
                'store_code' => $store->code ?? null,
                'store_location' => $storeLocation,
                'control_type' => $request->control_type,
                'control_date_from' => $request->control_date_from,
                'control_date_to' => $request->control_date_to,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'status' => 'draft',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Save participants
            if ($request->has('participants')) {
                foreach ($request->participants as $participant) {
                    // Set default function if not provided
                    $function = $participant['function'] ?? '';
                    if (empty($function)) {
                        $function = 'Zaposlenik'; // Default value
                    }
                    
                    // Handle user_id - convert empty string to null
                    $userId = $participant['user_id'] ?? null;
                    if ($userId === '' || $userId === 0) {
                        $userId = null;
                    } else {
                        $userId = (int) $userId;
                    }
                    
                    DB::table('retail_control_participants')->insert([
                        'control_record_id' => $recordId,
                        'user_id' => $userId,
                        'name' => $participant['name'],
                        'function' => $function,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Save present persons
            if ($request->has('present_persons')) {
                foreach ($request->present_persons as $person) {
                    // If employee_id is provided, try to get function from employee
                    $function = $person['function'] ?? '';
                    if (empty($function) && !empty($person['employee_id'])) {
                        $employee = DB::table('hrm_employees')
                            ->where('hrm_employees.id', $person['employee_id'])
                            ->select('position', 'job_title')
                            ->first();
                        // Use job_title if available, otherwise use position
                        $function = $employee->job_title ?? $employee->position ?? 'Zaposlenik';
                    }
                    
                    // Default value if still empty
                    if (empty($function)) {
                        $function = 'Zaposlenik';
                    }

                    DB::table('retail_control_present_persons')->insert([
                        'control_record_id' => $recordId,
                        'employee_id' => $person['employee_id'] ?? null,
                        'name' => $person['name'],
                        'function' => $function,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Save inventory items (if total inventory)
            if ($request->control_type === 'total_inventory' && $request->has('inventory_items')) {
                $totalBookValue = 0;
                $totalCountedValue = 0;

                foreach ($request->inventory_items as $item) {
                    $difference = ($item['counted_value'] ?? 0) - ($item['book_value'] ?? 0);
                    // Calculate difference value (using difference_value if provided, otherwise calculate from difference)
                    $differenceValue = $item['difference_value'] ?? ($difference * ($item['unit_price'] ?? 0));

                    $totalBookValue += $item['book_value'] ?? 0;
                    $totalCountedValue += $item['counted_value'] ?? 0;

                    DB::table('retail_inventory_items')->insert([
                        'control_record_id' => $recordId,
                        'article_name' => $item['article_name'],
                        'article_code' => $item['article_code'] ?? null,
                        'book_value' => $item['book_value'] ?? 0,
                        'counted_value' => $item['counted_value'] ?? 0,
                        'difference' => $difference,
                        'difference_value' => $differenceValue,
                        'notes' => $item['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $totalDifference = $totalCountedValue - $totalBookValue;
                $inventoryStatus = 'no_difference';
                if ($totalDifference < 0) $inventoryStatus = 'shortage';
                elseif ($totalDifference > 0) $inventoryStatus = 'surplus';
                else $inventoryStatus = 'no_difference';

                // Check if has both shortages and surpluses
                $hasShortage = DB::table('retail_inventory_items')
                    ->where('control_record_id', $recordId)
                    ->where('difference', '<', 0)
                    ->exists();
                $hasSurplus = DB::table('retail_inventory_items')
                    ->where('control_record_id', $recordId)
                    ->where('difference', '>', 0)
                    ->exists();
                
                if ($hasShortage && $hasSurplus) {
                    $inventoryStatus = 'combined';
                }

                DB::table('retail_control_records')
                    ->where('id', $recordId)
                    ->update([
                        'total_book_value' => $totalBookValue,
                        'total_counted_value' => $totalCountedValue,
                        'total_difference' => $totalDifference,
                        'inventory_status' => $inventoryStatus,
                        'deviation_reasons' => $request->deviation_reasons ? json_encode($request->deviation_reasons) : null,
                        'deviation_reason_other' => $request->deviation_reason_other,
                        'inventory_conclusion' => $request->inventory_conclusion,
                        'corrective_measures_proposed' => $request->corrective_measures_proposed ?? false,
                    ]);
            }

            // Save observations (if inspection)
            if ($request->control_type === 'inspection' && $request->has('observations')) {
                foreach ($request->observations as $observation) {
                    DB::table('retail_control_observations')->insert([
                        'control_record_id' => $recordId,
                        'category' => $observation['category'],
                        'item' => $observation['item'],
                        'status' => $observation['status'] ?? null,
                        'note' => $observation['note'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Save measures
            if ($request->has('measures')) {
                foreach ($request->measures as $measure) {
                    DB::table('retail_control_measures')->insert([
                        'control_record_id' => $recordId,
                        'measure' => $measure['measure'],
                        'responsible_user_id' => $measure['responsible_user_id'] ?? null,
                        'responsible_name' => $measure['responsible_name'] ?? null,
                        'deadline' => $measure['deadline'] ?? null,
                        'status' => $measure['status'] ?? 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Save observations text
            if ($request->has('positive_observations')) {
                DB::table('retail_control_records')
                    ->where('id', $recordId)
                    ->update(['positive_observations' => $request->positive_observations]);
            }

            if ($request->has('negative_observations')) {
                DB::table('retail_control_records')
                    ->where('id', $recordId)
                    ->update(['negative_observations' => $request->negative_observations]);
            }

            // Save store rating
            if ($request->has('store_rating')) {
                DB::table('retail_control_records')
                    ->where('id', $recordId)
                    ->update([
                        'store_rating' => $request->store_rating,
                        'store_rating_comment' => $request->store_rating_comment,
                    ]);
            }

            DB::commit();

            return response()->json($this->show($recordId)->getData(), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating control record', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request' => $request->all()
            ]);
            return response()->json([
                'error' => 'Failed to create control record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update control record
     */
    public function update(Request $request, $id)
    {
        try {
            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            if ($record->status === 'locked') {
                return response()->json(['error' => 'Control record is locked and cannot be modified'], 403);
            }

            $validator = Validator::make($request->all(), [
                'control_date_from' => 'sometimes|required|date',
                'control_date_to' => 'nullable|date|after_or_equal:control_date_from',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::beginTransaction();

            // Update main record
            $updateData = [];
            if ($request->has('control_date_from')) $updateData['control_date_from'] = $request->control_date_from;
            if ($request->has('control_date_to')) $updateData['control_date_to'] = $request->control_date_to;
            if ($request->has('start_time')) $updateData['start_time'] = $request->start_time;
            if ($request->has('end_time')) $updateData['end_time'] = $request->end_time;
            if ($request->has('status')) $updateData['status'] = $request->status;
            if ($request->has('inventory_conclusion')) $updateData['inventory_conclusion'] = $request->inventory_conclusion;
            if ($request->has('corrective_measures_proposed')) $updateData['corrective_measures_proposed'] = $request->corrective_measures_proposed;
            if ($request->has('positive_observations')) $updateData['positive_observations'] = $request->positive_observations;
            if ($request->has('negative_observations')) $updateData['negative_observations'] = $request->negative_observations;
            if ($request->has('store_rating')) $updateData['store_rating'] = $request->store_rating;
            if ($request->has('store_rating_comment')) $updateData['store_rating_comment'] = $request->store_rating_comment;
            if ($request->has('deviation_reasons')) $updateData['deviation_reasons'] = json_encode($request->deviation_reasons);
            if ($request->has('deviation_reason_other')) $updateData['deviation_reason_other'] = $request->deviation_reason_other;

            if (!empty($updateData)) {
                $updateData['updated_at'] = now();
                DB::table('retail_control_records')->where('id', $id)->update($updateData);
            }

            // Update participants
            if ($request->has('participants')) {
                DB::table('retail_control_participants')->where('control_record_id', $id)->delete();
                foreach ($request->participants as $participant) {
                    // Set default function if not provided
                    $function = $participant['function'] ?? '';
                    if (empty($function)) {
                        $function = 'Zaposlenik'; // Default value
                    }
                    
                    // Handle user_id - convert empty string to null
                    $userId = $participant['user_id'] ?? null;
                    if ($userId === '' || $userId === 0) {
                        $userId = null;
                    } else {
                        $userId = (int) $userId;
                    }
                    
                    DB::table('retail_control_participants')->insert([
                        'control_record_id' => $id,
                        'user_id' => $userId,
                        'name' => $participant['name'],
                        'function' => $function,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Update present persons
            if ($request->has('present_persons')) {
                DB::table('retail_control_present_persons')->where('control_record_id', $id)->delete();
                foreach ($request->present_persons as $person) {
                    DB::table('retail_control_present_persons')->insert([
                        'control_record_id' => $id,
                        'employee_id' => $person['employee_id'] ?? null,
                        'name' => $person['name'],
                        'function' => $person['function'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Update inventory items
            if ($request->has('inventory_items')) {
                DB::table('retail_inventory_items')->where('control_record_id', $id)->delete();
                
                $totalBookValue = 0;
                $totalCountedValue = 0;

                foreach ($request->inventory_items as $item) {
                    $difference = ($item['counted_value'] ?? 0) - ($item['book_value'] ?? 0);
                    // Calculate difference value (using difference_value if provided, otherwise calculate from difference)
                    $differenceValue = $item['difference_value'] ?? ($difference * ($item['unit_price'] ?? 0));

                    $totalBookValue += $item['book_value'] ?? 0;
                    $totalCountedValue += $item['counted_value'] ?? 0;

                    DB::table('retail_inventory_items')->insert([
                        'control_record_id' => $id,
                        'article_name' => $item['article_name'],
                        'article_code' => $item['article_code'] ?? null,
                        'book_value' => $item['book_value'] ?? 0,
                        'counted_value' => $item['counted_value'] ?? 0,
                        'difference' => $difference,
                        'difference_value' => $differenceValue,
                        'notes' => $item['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $totalDifference = $totalCountedValue - $totalBookValue;
                $inventoryStatus = 'no_difference';
                if ($totalDifference < 0) $inventoryStatus = 'shortage';
                elseif ($totalDifference > 0) $inventoryStatus = 'surplus';
                else $inventoryStatus = 'no_difference';

                $hasShortage = DB::table('retail_inventory_items')
                    ->where('control_record_id', $id)
                    ->where('difference', '<', 0)
                    ->exists();
                $hasSurplus = DB::table('retail_inventory_items')
                    ->where('control_record_id', $id)
                    ->where('difference', '>', 0)
                    ->exists();
                
                if ($hasShortage && $hasSurplus) {
                    $inventoryStatus = 'combined';
                }

                DB::table('retail_control_records')
                    ->where('id', $id)
                    ->update([
                        'total_book_value' => $totalBookValue,
                        'total_counted_value' => $totalCountedValue,
                        'total_difference' => $totalDifference,
                        'inventory_status' => $inventoryStatus,
                    ]);
            }

            // Update observations
            if ($request->has('observations')) {
                DB::table('retail_control_observations')->where('control_record_id', $id)->delete();
                foreach ($request->observations as $observation) {
                    DB::table('retail_control_observations')->insert([
                        'control_record_id' => $id,
                        'category' => $observation['category'],
                        'item' => $observation['item'],
                        'status' => $observation['status'] ?? null,
                        'note' => $observation['note'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Update measures
            if ($request->has('measures')) {
                // Delete existing measures not in the request
                $requestMeasureIds = collect($request->measures)->pluck('id')->filter();
                if ($requestMeasureIds->isNotEmpty()) {
                    DB::table('retail_control_measures')
                        ->where('control_record_id', $id)
                        ->whereNotIn('id', $requestMeasureIds->toArray())
                        ->delete();
                } else {
                    DB::table('retail_control_measures')->where('control_record_id', $id)->delete();
                }

                foreach ($request->measures as $measure) {
                    if (isset($measure['id']) && $measure['id']) {
                        // Update existing
                        DB::table('retail_control_measures')
                            ->where('id', $measure['id'])
                            ->update([
                                'measure' => $measure['measure'],
                                'responsible_user_id' => $measure['responsible_user_id'] ?? null,
                                'responsible_name' => $measure['responsible_name'] ?? null,
                                'deadline' => $measure['deadline'] ?? null,
                                'status' => $measure['status'] ?? 'pending',
                                'updated_at' => now(),
                            ]);
                    } else {
                        // Insert new
                        DB::table('retail_control_measures')->insert([
                            'control_record_id' => $id,
                            'measure' => $measure['measure'],
                            'responsible_user_id' => $measure['responsible_user_id'] ?? null,
                            'responsible_name' => $measure['responsible_name'] ?? null,
                            'deadline' => $measure['deadline'] ?? null,
                            'status' => $measure['status'] ?? 'pending',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json($this->show($id)->getData());
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to update control record'], 500);
        }
    }

    /**
     * Delete control record
     */
    public function destroy($id)
    {
        try {
            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            if ($record->status === 'locked') {
                return response()->json(['error' => 'Cannot delete locked control record'], 403);
            }

            // Delete all related data (cascade delete should handle this, but being explicit)
            DB::table('retail_control_participants')->where('control_record_id', $id)->delete();
            DB::table('retail_control_present_persons')->where('control_record_id', $id)->delete();
            DB::table('retail_inventory_items')->where('control_record_id', $id)->delete();
            DB::table('retail_control_observations')->where('control_record_id', $id)->delete();
            DB::table('retail_control_measures')->where('control_record_id', $id)->delete();
            
            // Delete attachments files
            $attachments = DB::table('retail_control_attachments')->where('control_record_id', $id)->get();
            foreach ($attachments as $attachment) {
                if (Storage::disk('public')->exists($attachment->file_path)) {
                    Storage::disk('public')->delete($attachment->file_path);
                }
            }
            DB::table('retail_control_attachments')->where('control_record_id', $id)->delete();
            
            DB::table('retail_control_signatures')->where('control_record_id', $id)->delete();
            DB::table('retail_control_records')->where('id', $id)->delete();

            return response()->json(['message' => 'Control record deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete control record'], 500);
        }
    }

    /**
     * Upload attachment file
     */
    public function uploadAttachment(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:51200', // 50MB max
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            
            // Determine file type
            $fileType = 'other';
            if (str_starts_with($mimeType, 'image/')) {
                $fileType = 'image';
            } elseif ($mimeType === 'application/pdf') {
                $fileType = 'pdf';
            } elseif (in_array($mimeType, ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])) {
                $fileType = 'excel';
            }

            // Store file
            $filename = time() . '_' . $id . '_' . $originalName;
            $path = $file->storeAs('retail_control_attachments', $filename, 'public');
            
            $attachmentId = DB::table('retail_control_attachments')->insertGetId([
                'control_record_id' => $id,
                'file_path' => $path,
                'file_name' => $originalName,
                'file_type' => $fileType,
                'mime_type' => $mimeType,
                'file_size' => $size,
                'notes' => $request->notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $attachment = DB::table('retail_control_attachments')->where('id', $attachmentId)->first();
            $attachment->file_url = '/api/retail/control-records/' . $id . '/attachments/' . $attachmentId;

            return response()->json($attachment, 201);
        } catch (\Exception $e) {
            Log::error('Error uploading attachment', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to upload attachment'], 500);
        }
    }

    /**
     * Get/download attachment file
     */
    public function getAttachment($id, $attachmentId)
    {
        try {
            $attachment = DB::table('retail_control_attachments')
                ->where('id', $attachmentId)
                ->where('control_record_id', $id)
                ->first();

            if (!$attachment) {
                return response()->json(['error' => 'Attachment not found'], 404);
            }

            $filePath = Storage::disk('public')->path($attachment->file_path);
            
            if (!file_exists($filePath)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            return response()->file($filePath, [
                'Content-Type' => $attachment->mime_type ?? 'application/octet-stream',
                'Content-Disposition' => 'inline; filename="' . $attachment->file_name . '"',
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting attachment', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to get attachment'], 500);
        }
    }

    /**
     * Delete attachment
     */
    public function deleteAttachment($id, $attachmentId)
    {
        try {
            $attachment = DB::table('retail_control_attachments')
                ->where('id', $attachmentId)
                ->where('control_record_id', $id)
                ->first();

            if (!$attachment) {
                return response()->json(['error' => 'Attachment not found'], 404);
            }

            if (Storage::disk('public')->exists($attachment->file_path)) {
                Storage::disk('public')->delete($attachment->file_path);
            }

            DB::table('retail_control_attachments')->where('id', $attachmentId)->delete();

            return response()->json(['message' => 'Attachment deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting attachment', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete attachment'], 500);
        }
    }

    /**
     * Sign control record
     */
    public function sign(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'signature_type' => 'required|in:controller,store_manager',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            // Check if already signed
            $existing = DB::table('retail_control_signatures')
                ->where('control_record_id', $id)
                ->where('user_id', $user->id)
                ->where('signature_type', $request->signature_type)
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Already signed'], 422);
            }

            $signatureId = DB::table('retail_control_signatures')->insertGetId([
                'control_record_id' => $id,
                'user_id' => $user->id,
                'signature_type' => $request->signature_type,
                'signature_hash' => hash('sha256', $id . $user->id . $request->signature_type . now()),
                'signed_at' => now(),
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $signature = DB::table('retail_control_signatures')
                ->select('retail_control_signatures.*', 'users.name as user_name')
                ->leftJoin('users', 'retail_control_signatures.user_id', '=', 'users.id')
                ->where('retail_control_signatures.id', $signatureId)
                ->first();

            return response()->json($signature, 201);
        } catch (\Exception $e) {
            Log::error('Error signing control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to sign control record'], 500);
        }
    }

    /**
     * Finalize control record
     */
    public function finalize(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            if ($record->status === 'locked') {
                return response()->json(['error' => 'Control record is already locked'], 422);
            }

            // Check if has participants (required)
            $hasParticipants = DB::table('retail_control_participants')
                ->where('control_record_id', $id)
                ->exists();

            // Check if has controller signature (required)
            $hasControllerSignature = DB::table('retail_control_signatures')
                ->where('control_record_id', $id)
                ->where('signature_type', 'controller')
                ->exists();

            if (!$hasControllerSignature) {
                return response()->json(['error' => 'Cannot finalize without controller signature'], 422);
            }

            // Participants are optional, but recommended
            // If no participants, we'll allow finalization but log a warning
            if (!$hasParticipants) {
                Log::warning('Finalizing control record without participants', ['record_id' => $id]);
            }

            DB::table('retail_control_records')
                ->where('id', $id)
                ->update([
                    'status' => 'finalized',
                    'updated_at' => now(),
                ]);

            return response()->json(['message' => 'Control record finalized successfully']);
        } catch (\Exception $e) {
            Log::error('Error finalizing control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to finalize control record'], 500);
        }
    }

    /**
     * Lock control record (no more changes allowed)
     */
    public function lock(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            if ($record->status !== 'finalized') {
                return response()->json(['error' => 'Control record must be finalized before locking'], 422);
            }

            DB::table('retail_control_records')
                ->where('id', $id)
                ->update([
                    'status' => 'locked',
                    'updated_at' => now(),
                ]);

            return response()->json(['message' => 'Control record locked successfully']);
        } catch (\Exception $e) {
            Log::error('Error locking control record', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to lock control record'], 500);
        }
    }

    /**
     * Generate PDF for control record
     */
    public function generatePdf(Request $request, $id)
    {
        try {
            $record = DB::table('retail_control_records')->where('id', $id)->first();
            if (!$record) {
                return response()->json(['error' => 'Control record not found'], 404);
            }

            // Check if record is finalized or locked
            if ($record->status === 'draft') {
                return response()->json(['error' => 'Control record must be finalized before generating PDF'], 422);
            }

            // Get store details
            $store = DB::table('hrm_stores')->where('id', $record->store_id)->first();
            
            if (!$store) {
                Log::error('Store not found for control record', [
                    'record_id' => $id,
                    'store_id' => $record->store_id,
                ]);
                return response()->json([
                    'error' => 'Store not found',
                    'message' => 'Store associated with this control record was not found'
                ], 404);
            }
            
            // Get participants
            $participants = DB::table('retail_control_participants')
                ->leftJoin('users', 'retail_control_participants.user_id', '=', 'users.id')
                ->where('retail_control_participants.control_record_id', $id)
                ->select('retail_control_participants.*', 'users.name as user_name', 'users.email as user_email')
                ->get();

            // Get present persons
            $presentPersons = DB::table('retail_control_present_persons')
                ->leftJoin('hrm_employees', 'retail_control_present_persons.employee_id', '=', 'hrm_employees.id')
                ->leftJoin('users', 'hrm_employees.user_id', '=', 'users.id')
                ->where('retail_control_present_persons.control_record_id', $id)
                ->select('retail_control_present_persons.*', 'users.name as employee_name', 'users.email as employee_email')
                ->get();

            // Get inventory items (if total inventory)
            $inventoryItems = [];
            if ($record->control_type === 'total_inventory') {
                $inventoryItems = DB::table('retail_inventory_items')
                    ->where('control_record_id', $id)
                    ->get();
            }

            // Get observations (if inspection)
            $observations = [];
            if ($record->control_type === 'inspection') {
                $observations = DB::table('retail_control_observations')
                    ->where('control_record_id', $id)
                    ->get();
            }

            // Get measures
            $measures = DB::table('retail_control_measures')
                ->leftJoin('users', 'retail_control_measures.responsible_user_id', '=', 'users.id')
                ->where('retail_control_measures.control_record_id', $id)
                ->select(
                    'retail_control_measures.*',
                    'users.name as responsible_user_name'
                )
                ->get();

            // Get signatures
            $signatures = DB::table('retail_control_signatures')
                ->leftJoin('users', 'retail_control_signatures.user_id', '=', 'users.id')
                ->where('retail_control_signatures.control_record_id', $id)
                ->select('retail_control_signatures.*', 'users.name as user_name', 'users.email as user_email')
                ->get();

            // Get attachments (images)
            $attachments = DB::table('retail_control_attachments')
                ->where('control_record_id', $id)
                ->get();
            
            // Check if GD extension is available for image processing
            $gdAvailable = extension_loaded('gd');
            
            if (!$gdAvailable) {
                Log::warning('GD extension not available - using base64 encoding for images');
            }
            
            // Add file URLs for attachments - always use base64 to avoid GD requirement
            foreach ($attachments as $attachment) {
                try {
                    $filePath = Storage::disk('public')->path($attachment->file_path);
                    if (file_exists($filePath)) {
                        // Always convert image to base64 for PDF embedding (avoids GD requirement)
                        $imageData = file_get_contents($filePath);
                        $base64 = base64_encode($imageData);
                        
                        // Determine MIME type
                        $mimeType = null;
                        if (function_exists('mime_content_type')) {
                            $mimeType = mime_content_type($filePath);
                        }
                        
                        if (!$mimeType && isset($attachment->mime_type)) {
                            $mimeType = $attachment->mime_type;
                        }
                        
                        // Fallback to file extension if MIME type not available
                        if (!$mimeType && isset($attachment->file_name)) {
                            $extension = strtolower(pathinfo($attachment->file_name, PATHINFO_EXTENSION));
                            $mimeTypes = [
                                'jpg' => 'image/jpeg',
                                'jpeg' => 'image/jpeg',
                                'png' => 'image/png',
                                'gif' => 'image/gif',
                                'webp' => 'image/webp',
                            ];
                            $mimeType = $mimeTypes[$extension] ?? 'image/jpeg';
                        }
                        
                        $mimeType = $mimeType ?: 'image/jpeg';
                        $attachment->base64_data = 'data:' . $mimeType . ';base64,' . $base64;
                    } else {
                        Log::warning('Attachment file not found', [
                            'attachment_id' => $attachment->id,
                            'file_path' => $attachment->file_path,
                            'full_path' => $filePath,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Error processing attachment for PDF', [
                        'attachment_id' => $attachment->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Prepare data for PDF
            $data = [
                'record' => $record,
                'store' => $store,
                'participants' => $participants,
                'presentPersons' => $presentPersons,
                'inventoryItems' => $inventoryItems,
                'observations' => $observations,
                'measures' => $measures,
                'signatures' => $signatures,
                'attachments' => $attachments,
            ];

            // Log data for debugging
            Log::info('PDF Generation Data', [
                'record_id' => $id,
                'has_record' => !empty($record),
                'has_store' => !empty($store),
                'participants_count' => $participants->count(),
                'present_persons_count' => $presentPersons->count(),
            ]);

            try {
                // Check if GD extension is available
                if (!extension_loaded('gd')) {
                    Log::warning('GD extension not loaded - PDF generation may fail with images');
                    // Note: We use base64 images so GD shouldn't be required, but DomPDF may still need it
                }
                
                // Log to see if we get here
                Log::info('About to generate PDF', [
                    'record_id' => $id,
                    'has_record' => !empty($record),
                    'has_store' => !empty($store),
                    'data_keys' => array_keys($data),
                    'gd_loaded' => extension_loaded('gd'),
                    'attachments_count' => isset($attachments) ? $attachments->count() : 0,
                ]);
                
                // Validate required data
                if (empty($record)) {
                    throw new \Exception('Record data is missing');
                }
                
                // Generate PDF - using control-record-pdf template
                $pdf = Pdf::loadView('retail.control-record-pdf', $data);
                $pdf->setPaper('a4', 'portrait');
                
                // Set options for better compatibility
                try {
                    $pdf->setOption('enable-local-file-access', true);
                } catch (\Exception $e) {
                    Log::warning('Could not set enable-local-file-access option', ['error' => $e->getMessage()]);
                }
                
                try {
                    $pdf->setOption('isRemoteEnabled', true);
                } catch (\Exception $e) {
                    Log::warning('Could not set isRemoteEnabled option', ['error' => $e->getMessage()]);
                }
                
                try {
                    $pdf->setOption('defaultFont', 'DejaVu Sans');
                } catch (\Exception $e) {
                    Log::warning('Could not set defaultFont option', ['error' => $e->getMessage()]);
                }
                
                // Get PDF output and check size
                $output = $pdf->output();
                $outputSize = strlen($output);
                
                Log::info('PDF generated successfully', [
                    'record_id' => $id,
                    'output_size' => $outputSize,
                ]);
                
                if ($outputSize === 0) {
                    Log::error('PDF output is empty', ['record_id' => $id]);
                    return response()->json([
                        'error' => 'PDF output is empty',
                        'message' => 'PDF was generated but is empty. Please check template and data.'
                    ], 500);
                }

                // Return as stream download
                return response()->streamDownload(function() use ($output) {
                    echo $output;
                }, 'evidencija-kontrole-' . $id . '.pdf', [
                    'Content-Type' => 'application/pdf',
                    'Content-Length' => $outputSize,
                ]);
            } catch (\Throwable $pdfException) {
                $errorMessage = $pdfException->getMessage();
                $userFriendlyMessage = $errorMessage;
                
                // Check if error is about GD extension
                if (str_contains($errorMessage, 'GD extension') || str_contains($errorMessage, 'gd')) {
                    $userFriendlyMessage = 'PHP GD ekstenzija nije instalirana. Molimo omogućite GD ekstenziju u php.ini fajlu.';
                }
                
                Log::error('PDF Generation Exception', [
                    'error' => $errorMessage,
                    'line' => $pdfException->getLine(),
                    'file' => $pdfException->getFile(),
                    'record_id' => $id,
                    'gd_loaded' => extension_loaded('gd'),
                    'trace' => $pdfException->getTraceAsString(),
                ]);
                
                return response()->json([
                    'error' => 'Failed to generate PDF',
                    'message' => $userFriendlyMessage,
                    'technical_error' => $errorMessage,
                    'details' => 'Check server logs for more information'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Error generating PDF for control record', [
                'error' => $e->getMessage(),
                'record_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }
}
