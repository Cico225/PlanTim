<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crm\Account;
use App\Models\Crm\Contact;
use App\Models\Crm\Deal;
use App\Models\Crm\Activity;
use App\Models\Crm\Tag;
use App\Models\Crm\Document;
use App\Models\Crm\Pipeline;
use App\Models\Crm\DealStage;
use App\Models\Crm\AuditLog;
use App\Models\Crm\CommunicationLog;
use App\Services\CrmWorkflowService;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CRMController extends Controller
{
    /**
     * Check if CRM tables exist
     */
    private function checkCRMTables(): bool
    {
        return Schema::hasTable('crm_companies') 
            && Schema::hasTable('crm_contacts')
            && Schema::hasTable('crm_deals')
            && Schema::hasTable('crm_activities');
    }

    /**
     * Check if column exists in table
     */
    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }

    /**
     * Split a full name into first and last name for response
     */
    private function splitNameForResponse(?string $name): array
    {
        if (empty($name)) {
            return ['first' => '', 'last' => ''];
        }
        
        $name = trim($name);
        $parts = preg_split('/\s+/', $name, 2);
        
        return [
            'first' => $parts[0] ?? '',
            'last' => $parts[1] ?? ''
        ];
    }

    /**
     * Get CRM dashboard statistics
     */
    public function index(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json([
                    'contacts_count' => 0,
                    'companies_count' => 0,
                    'deals_count' => 0,
                    'activities_count' => 0,
                    'deals_total_value' => 0,
                    'deals_by_stage' => [],
                ]);
            }

            $user = $request->user();
            $userId = $user ? $user->id : null;

            // Build recent activities query
            $recentActivitiesQuery = DB::table('crm_activities')
                ->select('crm_activities.*');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $recentActivitiesQuery->leftJoin('users', 'crm_activities.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            $recentActivitiesQuery->orderBy('crm_activities.created_at', 'desc')
                ->limit(5);

            $stats = [
                'contacts_count' => DB::table('crm_contacts')->count(),
                'companies_count' => DB::table('crm_companies')->count(),
                'deals_count' => DB::table('crm_deals')->count(),
                'activities_count' => DB::table('crm_activities')->count(),
                'deals_total_value' => DB::table('crm_deals')->sum('value') ?? 0,
                'deals_by_stage' => DB::table('crm_deals')
                    ->select('stage', DB::raw('count(*) as count'), DB::raw('sum(value) as total_value'))
                    ->groupBy('stage')
                    ->get(),
                'recent_activities' => $recentActivitiesQuery->get(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Error in CRM index', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load CRM statistics'], 500);
        }
    }

    // ==================== CONTACTS ====================

    public function getContacts(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['data' => [], 'total' => 0]);
            }

            $query = DB::table('crm_contacts')
                ->select('crm_contacts.*')
                ->leftJoin('crm_companies', 'crm_contacts.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_contacts', 'owner_id')) {
                $query->leftJoin('users', 'crm_contacts.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_contacts', 'created_by')) {
                $query->leftJoin('users as creator', 'crm_contacts.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            $query->orderBy('crm_contacts.created_at', 'desc');

            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    if ($this->hasColumn('crm_contacts', 'first_name')) {
                        $q->where('crm_contacts.first_name', 'like', "%{$search}%")
                          ->orWhere('crm_contacts.last_name', 'like', "%{$search}%");
                    } elseif ($this->hasColumn('crm_contacts', 'name')) {
                        $q->where('crm_contacts.name', 'like', "%{$search}%");
                    }
                    $q->orWhere('crm_contacts.email', 'like', "%{$search}%")
                      ->orWhere('crm_contacts.phone', 'like', "%{$search}%");
                });
            }

            // Filter by company
            if ($request->has('company_id')) {
                $query->where('crm_contacts.company_id', $request->input('company_id'));
            }

            $contacts = $query->paginate($request->input('per_page', 15));
            
            // Transform response to match frontend expectations
            // If table has 'name' but frontend expects 'first_name'/'last_name', split it
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                $contacts->getCollection()->transform(function ($contact) {
                    if (isset($contact->name) && !isset($contact->first_name)) {
                        $nameParts = $this->splitNameForResponse($contact->name);
                        $contact->first_name = $nameParts['first'];
                        $contact->last_name = $nameParts['last'];
                    }
                    return $contact;
                });
            }

            return response()->json($contacts);
        } catch (\Exception $e) {
            Log::error('Error in getContacts', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load contacts'], 500);
        }
    }

    public function getContact(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $contactQuery = DB::table('crm_contacts')
                ->select('crm_contacts.*')
                ->leftJoin('crm_companies', 'crm_contacts.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_contacts', 'owner_id')) {
                $contactQuery->leftJoin('users', 'crm_contacts.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            $contact = $contactQuery->where('crm_contacts.id', $id)->first();

            if (!$contact) {
                return response()->json(['error' => 'Contact not found'], 404);
            }
            
            // Transform response to match frontend expectations
            // If table has 'name' but frontend expects 'first_name'/'last_name', split it
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($contact->name) && !isset($contact->first_name)) {
                    $nameParts = $this->splitNameForResponse($contact->name);
                    $contact->first_name = $nameParts['first'];
                    $contact->last_name = $nameParts['last'];
                }
            }

            // Get related deals
            $dealsQuery = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->leftJoin('crm_companies', 'crm_deals.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name')
                ->where('crm_deals.contact_id', $id);
            
            // Only include non-deleted deals
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $dealsQuery->whereNull('crm_deals.deleted_at');
            }
            
            // Join contacts for deals if needed
            $dealsQuery->leftJoin('crm_contacts', 'crm_deals.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $dealsQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                     'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $dealsQuery->addSelect('crm_contacts.name as contact_name');
            }
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $dealsQuery->leftJoin('users as owner', 'crm_deals.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            $deals = $dealsQuery->get();
            
            // Transform deals contact data if needed
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                $deals->transform(function ($deal) {
                    if (isset($deal->contact_name) && !isset($deal->contact_first_name)) {
                        $nameParts = $this->splitNameForResponse($deal->contact_name);
                        $deal->contact_first_name = $nameParts['first'];
                        $deal->contact_last_name = $nameParts['last'];
                        unset($deal->contact_name);
                    }
                    return $deal;
                });
            }
            
            $contact->deals = $deals;

            // Get related activities
            $activitiesQuery = DB::table('crm_activities')
                ->select('crm_activities.*')
                ->where('crm_activities.contact_id', $id);
            
            // Only include non-deleted activities
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                $activitiesQuery->whereNull('crm_activities.deleted_at');
            }
            
            // Only join users if owner_id or user_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $activitiesQuery->leftJoin('users', 'crm_activities.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                $activitiesQuery->leftJoin('users', 'crm_activities.user_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Order by scheduled_at or due_date depending on what exists
            if ($this->hasColumn('crm_activities', 'scheduled_at')) {
                $activitiesQuery->orderBy('crm_activities.scheduled_at', 'desc');
            } elseif ($this->hasColumn('crm_activities', 'due_date')) {
                $activitiesQuery->orderBy('crm_activities.due_date', 'desc');
            } else {
                $activitiesQuery->orderBy('crm_activities.created_at', 'desc');
            }
            
            $activities = $activitiesQuery->get();
            
            // Transform activities - map due_date to scheduled_at if needed
            $activities->transform(function ($activity) {
                if (isset($activity->due_date) && !isset($activity->scheduled_at)) {
                    $activity->scheduled_at = $activity->due_date;
                }
                return $activity;
            });
            
            $contact->activities = $activities;

            return response()->json($contact);
        } catch (\Exception $e) {
            Log::error('Error in getContact', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load contact',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeContact(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Adjust validation based on table structure
            $hasFirstName = $this->hasColumn('crm_contacts', 'first_name');
            $hasName = $this->hasColumn('crm_contacts', 'name');
            
            $rules = [
                'email' => 'required|email|unique:crm_contacts,email',
                'phone' => 'nullable|string|max:50',
                'mobile' => 'nullable|string|max:50',
                'company_id' => 'nullable|exists:crm_companies,id',
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:100',
                'status' => 'nullable|in:active,former,lead',
                'is_primary' => 'nullable|boolean',
                'preferred_communication' => 'nullable|in:email,phone,mobile,linkedin',
                'linkedin' => 'nullable|string|max:255',
                'address' => 'nullable|string',
                'city' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'birthday' => 'nullable|date',
                'notes' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ];
            
            // Add name validation based on table structure
            if ($hasFirstName) {
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            } elseif ($hasName) {
                // If table has 'name', allow both name and first_name/last_name
                // Frontend sends first_name/last_name, we'll combine them
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            } else {
                // Fallback: require at least one name field
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            }
            
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['phone', 'mobile', 'company_id', 'position', 'department', 'address', 'city', 'country', 'postal_code', 'birthday', 'notes', 'owner_id', 'linkedin'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Convert boolean values properly
            if (isset($data['is_primary'])) {
                $data['is_primary'] = filter_var($data['is_primary'], FILTER_VALIDATE_BOOLEAN);
            }
            
            // Set default values if not provided
            if (!isset($data['status']) && $this->hasColumn('crm_contacts', 'status')) {
                $data['status'] = 'active';
            }
            if (!isset($data['is_primary']) && $this->hasColumn('crm_contacts', 'is_primary')) {
                $data['is_primary'] = false;
            }
            if (!isset($data['preferred_communication']) && $this->hasColumn('crm_contacts', 'preferred_communication')) {
                $data['preferred_communication'] = 'email';
            }
            
            // Only set created_by if column exists
            if ($this->hasColumn('crm_contacts', 'created_by')) {
                $data['created_by'] = $user->id;
            }
            
            // Only set owner_id if column exists
            if ($this->hasColumn('crm_contacts', 'owner_id')) {
                $data['owner_id'] = $data['owner_id'] ?? $user->id;
            }
            
            $data['created_at'] = now();
            $data['updated_at'] = now();
            
            // Handle case where table has 'name' instead of 'first_name' and 'last_name'
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                // Combine first_name and last_name into name
                $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
                unset($data['first_name'], $data['last_name']);
            }
            
            // Remove fields that don't exist in database
            $allowedColumns = ['company_id', 'name', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'position', 
                              'department', 'status', 'is_primary', 'preferred_communication', 'avatar', 'address', 
                              'city', 'country', 'postal_code', 'birthday', 'linkedin', 'notes', 'owner_id', 
                              'created_by', 'created_at', 'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_contacts', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));

            $contactId = DB::table('crm_contacts')->insertGetId($data);

            $contactQuery = DB::table('crm_contacts')
                ->select('crm_contacts.*')
                ->leftJoin('crm_companies', 'crm_contacts.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_contacts', 'owner_id')) {
                $contactQuery->leftJoin('users', 'crm_contacts.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            $contact = $contactQuery->where('crm_contacts.id', $contactId)->first();

            return response()->json($contact, 201);
        } catch (\Exception $e) {
            Log::error('Error in storeContact', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to create contact',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateContact(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Adjust validation based on table structure
            $hasFirstName = $this->hasColumn('crm_contacts', 'first_name');
            $hasName = $this->hasColumn('crm_contacts', 'name');
            
            $rules = [
                'email' => 'required|email|unique:crm_contacts,email,' . $id,
                'phone' => 'nullable|string|max:50',
                'mobile' => 'nullable|string|max:50',
                'company_id' => 'nullable|exists:crm_companies,id',
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:100',
                'status' => 'nullable|in:active,former,lead',
                'is_primary' => 'nullable|boolean',
                'preferred_communication' => 'nullable|in:email,phone,mobile,linkedin',
                'linkedin' => 'nullable|string|max:255',
                'address' => 'nullable|string',
                'city' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'birthday' => 'nullable|date',
                'notes' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ];
            
            // Add name validation based on table structure
            if ($hasFirstName) {
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            } elseif ($hasName) {
                // If table has 'name', allow both name and first_name/last_name
                // Frontend sends first_name/last_name, we'll combine them
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            } else {
                // Fallback: require at least one name field
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
            }
            
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['phone', 'mobile', 'company_id', 'position', 'department', 'address', 'city', 'country', 'postal_code', 'birthday', 'notes', 'owner_id', 'linkedin'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Convert boolean values properly
            if (isset($data['is_primary'])) {
                $data['is_primary'] = filter_var($data['is_primary'], FILTER_VALIDATE_BOOLEAN);
            }
            
            $data['updated_at'] = now();
            
            // Handle case where table has 'name' instead of 'first_name' and 'last_name'
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                // Combine first_name and last_name into name
                if (isset($data['first_name']) || isset($data['last_name'])) {
                    $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
                    unset($data['first_name'], $data['last_name']);
                }
            }
            
            // Remove fields that don't exist in database
            $allowedColumns = ['company_id', 'name', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'position', 
                              'department', 'status', 'is_primary', 'preferred_communication', 'avatar', 'address', 
                              'city', 'country', 'postal_code', 'birthday', 'linkedin', 'notes', 'owner_id', 
                              'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_contacts', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));

            DB::table('crm_contacts')
                ->where('id', $id)
                ->update($data);

            $contact = DB::table('crm_contacts')
                ->select(
                    'crm_contacts.*',
                    'crm_companies.name as company_name',
                    'users.name as owner_name'
                )
                ->leftJoin('crm_companies', 'crm_contacts.company_id', '=', 'crm_companies.id')
                ->leftJoin('users', 'crm_contacts.owner_id', '=', 'users.id')
                ->where('crm_contacts.id', $id)
                ->first();

            return response()->json($contact);
        } catch (\Exception $e) {
            Log::error('Error in updateContact', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to update contact',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteContact(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if contact exists
            $contact = DB::table('crm_contacts')->where('id', $id)->first();
            if (!$contact) {
                return response()->json(['error' => 'Contact not found'], 404);
            }

            // Soft delete (only if column exists)
            if ($this->hasColumn('crm_contacts', 'deleted_at')) {
                DB::table('crm_contacts')
                    ->where('id', $id)
                    ->update(['deleted_at' => now()]);
            } else {
                // Hard delete if deleted_at doesn't exist
                DB::table('crm_contacts')->where('id', $id)->delete();
            }

            return response()->json(['message' => 'Contact deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteContact', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to delete contact'], 500);
        }
    }

    // ==================== COMPANIES ====================

    public function getCompanies(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['data' => [], 'total' => 0]);
            }

            $query = DB::table('crm_companies')
                ->select('crm_companies.*');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_companies', 'owner_id')) {
                $query->leftJoin('users', 'crm_companies.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_companies', 'created_by')) {
                $query->leftJoin('users as creator', 'crm_companies.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_companies', 'deleted_at')) {
                $query->whereNull('crm_companies.deleted_at');
                
                // Only use deleted_at in subqueries if columns exist
                if ($this->hasColumn('crm_contacts', 'deleted_at')) {
                    $query->selectRaw('(SELECT COUNT(*) FROM crm_contacts WHERE crm_contacts.company_id = crm_companies.id AND crm_contacts.deleted_at IS NULL) as contacts_count');
                } else {
                    $query->selectRaw('(SELECT COUNT(*) FROM crm_contacts WHERE crm_contacts.company_id = crm_companies.id) as contacts_count');
                }
                
                if ($this->hasColumn('crm_deals', 'deleted_at')) {
                    $query->selectRaw('(SELECT COUNT(*) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id AND crm_deals.deleted_at IS NULL) as deals_count')
                        ->selectRaw('(SELECT SUM(value) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id AND crm_deals.deleted_at IS NULL) as deals_total_value');
                } else {
                    $query->selectRaw('(SELECT COUNT(*) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id) as deals_count')
                        ->selectRaw('(SELECT SUM(value) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id) as deals_total_value');
                }
            } else {
                // No deleted_at, use simple counts
                $query->selectRaw('(SELECT COUNT(*) FROM crm_contacts WHERE crm_contacts.company_id = crm_companies.id) as contacts_count')
                    ->selectRaw('(SELECT COUNT(*) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id) as deals_count')
                    ->selectRaw('(SELECT SUM(value) FROM crm_deals WHERE crm_deals.company_id = crm_companies.id) as deals_total_value');
            }
            
            $query->orderBy('crm_companies.created_at', 'desc');

            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('crm_companies.name', 'like', "%{$search}%")
                      ->orWhere('crm_companies.email', 'like', "%{$search}%")
                      ->orWhere('crm_companies.phone', 'like', "%{$search}%");
                });
            }

            // Filter by industry
            if ($request->has('industry')) {
                $query->where('crm_companies.industry', $request->input('industry'));
            }

            $companies = $query->paginate($request->input('per_page', 15));

            return response()->json($companies);
        } catch (\Exception $e) {
            Log::error('Error in getCompanies', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load companies'], 500);
        }
    }

    public function getCompany(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $companyQuery = DB::table('crm_companies')
                ->select('crm_companies.*');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_companies', 'owner_id')) {
                $companyQuery->leftJoin('users', 'crm_companies.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_companies', 'created_by')) {
                $companyQuery->leftJoin('users as creator', 'crm_companies.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_companies', 'deleted_at')) {
                $companyQuery->whereNull('crm_companies.deleted_at');
            }
            
            $company = $companyQuery->where('crm_companies.id', $id)->first();

            if (!$company) {
                return response()->json(['error' => 'Company not found'], 404);
            }

            // Convert to array for easier manipulation
            $companyData = (array) $company;

            // Get related contacts
            $contactsQuery = DB::table('crm_contacts')->where('crm_contacts.company_id', $id);
            if ($this->hasColumn('crm_contacts', 'deleted_at')) {
                $contactsQuery->whereNull('crm_contacts.deleted_at');
            }
            $companyData['contacts'] = $contactsQuery->get()->toArray();

            // Get related deals
            $dealsQuery = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->where('crm_deals.company_id', $id);
            
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $dealsQuery->leftJoin('users', 'crm_deals.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $dealsQuery->whereNull('crm_deals.deleted_at');
            }
            
            $companyData['deals'] = $dealsQuery->get()->toArray();

            // Get related activities (only if company_id column exists)
            if ($this->hasColumn('crm_activities', 'company_id')) {
                $activitiesQuery = DB::table('crm_activities')
                    ->select('crm_activities.*')
                    ->where('crm_activities.company_id', $id);
                
                if ($this->hasColumn('crm_activities', 'owner_id')) {
                    $activitiesQuery->leftJoin('users', 'crm_activities.owner_id', '=', 'users.id')
                        ->addSelect('users.name as owner_name');
                }
                
                if ($this->hasColumn('crm_activities', 'deleted_at')) {
                    $activitiesQuery->whereNull('crm_activities.deleted_at');
                }
                
                // Order by scheduled_at if column exists, otherwise by created_at
                if ($this->hasColumn('crm_activities', 'scheduled_at')) {
                    $activitiesQuery->orderBy('crm_activities.scheduled_at', 'desc');
                } else {
                    $activitiesQuery->orderBy('crm_activities.created_at', 'desc');
                }
                
                $companyData['activities'] = $activitiesQuery->get()->toArray();
            } else {
                $companyData['activities'] = [];
            }

            return response()->json($companyData);
        } catch (\Exception $e) {
            Log::error('Error in getCompany', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load company'], 500);
        }
    }

    public function storeCompany(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'legal_name' => 'nullable|string|max:255',
                'type' => 'nullable|in:client,lead,supplier,partner',
                'status' => 'nullable|in:active,inactive,archived',
                'email' => 'nullable|email',
                'phone' => 'nullable|string|max:50',
                'website' => 'nullable|url|max:255',
                'industry' => 'nullable|string|max:100',
                'size' => 'nullable|string|max:50',
                'annual_revenue' => 'nullable|numeric|min:0',
                'tax_id' => 'nullable|string|max:50',
                'registration_number' => 'nullable|string|max:50',
                'source' => 'nullable|in:web,referral,campaign,manual',
                'rating' => 'nullable|in:A,B,C,D,E',
                'address' => 'nullable|string',
                'street' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'logo' => 'nullable|string',
                'notes' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Filter out fields that don't exist in the database
            $allowedColumns = [
                'name', 'legal_name', 'type', 'status', 'email', 'phone', 'website',
                'industry', 'size', 'annual_revenue', 'tax_id', 'registration_number',
                'source', 'rating', 'address', 'street', 'city', 'country', 'postal_code',
                'logo', 'notes', 'owner_id', 'created_by', 'created_at', 'updated_at'
            ];
            
            $filteredData = [];
            foreach ($allowedColumns as $column) {
                if (array_key_exists($column, $data) && $this->hasColumn('crm_companies', $column)) {
                    $filteredData[$column] = $data[$column];
                }
            }
            
            // Only set created_by if column exists
            if ($this->hasColumn('crm_companies', 'created_by')) {
                $filteredData['created_by'] = $user->id;
            }
            
            // Only set owner_id if column exists
            if ($this->hasColumn('crm_companies', 'owner_id')) {
                $filteredData['owner_id'] = $filteredData['owner_id'] ?? $user->id;
            }
            
            $filteredData['created_at'] = now();
            $filteredData['updated_at'] = now();

            $companyId = DB::table('crm_companies')->insertGetId($filteredData);

            $companyQuery = DB::table('crm_companies')
                ->select('crm_companies.*');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_companies', 'owner_id')) {
                $companyQuery->leftJoin('users', 'crm_companies.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_companies', 'created_by')) {
                $companyQuery->leftJoin('users as creator', 'crm_companies.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            $company = $companyQuery->where('crm_companies.id', $companyId)->first();

            return response()->json($company, 201);
        } catch (\Exception $e) {
            Log::error('Error in storeCompany', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to create company'], 500);
        }
    }

    public function updateCompany(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'legal_name' => 'nullable|string|max:255',
                'type' => 'nullable|in:client,lead,supplier,partner',
                'status' => 'nullable|in:active,inactive,archived',
                'email' => 'nullable|email',
                'phone' => 'nullable|string|max:50',
                'website' => 'nullable|url|max:255',
                'industry' => 'nullable|string|max:100',
                'size' => 'nullable|string|max:50',
                'annual_revenue' => 'nullable|numeric|min:0',
                'tax_id' => 'nullable|string|max:50',
                'registration_number' => 'nullable|string|max:50',
                'source' => 'nullable|in:web,referral,campaign,manual',
                'rating' => 'nullable|in:A,B,C,D,E',
                'address' => 'nullable|string',
                'street' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'logo' => 'nullable|string',
                'notes' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Filter out fields that don't exist in the database
            $allowedColumns = [
                'name', 'legal_name', 'type', 'status', 'email', 'phone', 'website',
                'industry', 'size', 'annual_revenue', 'tax_id', 'registration_number',
                'source', 'rating', 'address', 'street', 'city', 'country', 'postal_code',
                'logo', 'notes', 'owner_id', 'updated_at'
            ];
            
            $filteredData = [];
            foreach ($allowedColumns as $column) {
                if (array_key_exists($column, $data) && $this->hasColumn('crm_companies', $column)) {
                    $filteredData[$column] = $data[$column];
                }
            }
            
            $filteredData['updated_at'] = now();

            DB::table('crm_companies')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->update($filteredData);

            $company = DB::table('crm_companies')
                ->select(
                    'crm_companies.*',
                    'users.name as owner_name',
                    'creator.name as created_by_name'
                )
                ->leftJoin('users', 'crm_companies.owner_id', '=', 'users.id')
                ->leftJoin('users as creator', 'crm_companies.created_by', '=', 'creator.id')
                ->where('crm_companies.id', $id)
                ->first();

            return response()->json($company);
        } catch (\Exception $e) {
            Log::error('Error in updateCompany', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to update company'], 500);
        }
    }

    public function deleteCompany(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if company exists
            $companyQuery = DB::table('crm_companies')->where('id', $id);
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_companies', 'deleted_at')) {
                $companyQuery->whereNull('deleted_at');
            }
            
            $company = $companyQuery->first();
            if (!$company) {
                return response()->json(['error' => 'Company not found'], 404);
            }

            // Soft delete if column exists, otherwise hard delete
            if ($this->hasColumn('crm_companies', 'deleted_at')) {
                DB::table('crm_companies')
                    ->where('id', $id)
                    ->update(['deleted_at' => now()]);
            } else {
                DB::table('crm_companies')
                    ->where('id', $id)
                    ->delete();
            }

            return response()->json(['message' => 'Company deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteCompany', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to delete company'], 500);
        }
    }

    // ==================== DEALS ====================

    public function getDeals(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['data' => [], 'total' => 0]);
            }

            $query = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->leftJoin('crm_companies', 'crm_deals.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name')
                ->leftJoin('crm_contacts', 'crm_deals.contact_id', '=', 'crm_contacts.id');
            
            // Handle both contact name structures
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $query->addSelect('crm_contacts.first_name as contact_first_name', 
                                 'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $query->addSelect('crm_contacts.name as contact_name');
            }
            $query->addSelect('crm_contacts.email as contact_email');
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $query->leftJoin('users as owner', 'crm_deals.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_deals', 'created_by')) {
                $query->leftJoin('users as creator', 'crm_deals.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $query->whereNull('crm_deals.deleted_at');
            }
            
            $query->orderBy('crm_deals.created_at', 'desc');

            // Filter by stage
            if ($request->has('stage')) {
                $query->where('crm_deals.stage', $request->input('stage'));
            }

            // Filter by company
            if ($request->has('company_id')) {
                $query->where('crm_deals.company_id', $request->input('company_id'));
            }

            // Filter by owner (only if column exists)
            if ($request->has('owner_id') && $this->hasColumn('crm_deals', 'owner_id')) {
                $query->where('crm_deals.owner_id', $request->input('owner_id'));
            }

            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('crm_deals.title', 'like', "%{$search}%")
                      ->orWhere('crm_companies.name', 'like', "%{$search}%");
                });
            }

            $deals = $query->paginate($request->input('per_page', 15));
            
            // Transform response to match frontend expectations
            // If table has 'name' but frontend expects 'first_name'/'last_name', split it
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                $deals->getCollection()->transform(function ($deal) {
                    if (isset($deal->contact_name) && !isset($deal->contact_first_name)) {
                        $nameParts = $this->splitNameForResponse($deal->contact_name);
                        $deal->contact_first_name = $nameParts['first'];
                        $deal->contact_last_name = $nameParts['last'];
                        unset($deal->contact_name);
                    }
                    return $deal;
                });
            }

            return response()->json($deals);
        } catch (\Exception $e) {
            Log::error('Error in getDeals', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load deals'], 500);
        }
    }

    public function getDeal(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $dealQuery = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->leftJoin('crm_companies', 'crm_deals.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $dealQuery->leftJoin('crm_contacts', 'crm_deals.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $dealQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                     'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $dealQuery->addSelect('crm_contacts.name as contact_name');
            }
            $dealQuery->addSelect('crm_contacts.email as contact_email');
            
            // Only join users if columns exist
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $dealQuery->leftJoin('users as owner', 'crm_deals.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            if ($this->hasColumn('crm_deals', 'created_by')) {
                $dealQuery->leftJoin('users as creator', 'crm_deals.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            $dealQuery->where('crm_deals.id', $id);
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $dealQuery->whereNull('crm_deals.deleted_at');
            }
            
            $deal = $dealQuery->first();

            if (!$deal) {
                return response()->json(['error' => 'Deal not found'], 404);
            }
            
            // Transform contact data if needed
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($deal->contact_name)) {
                    $nameParts = $this->splitNameForResponse($deal->contact_name);
                    $deal->contact_first_name = $nameParts['first'];
                    $deal->contact_last_name = $nameParts['last'];
                    unset($deal->contact_name);
                }
            }

            // Get related activities
            $activitiesQuery = DB::table('crm_activities')
                ->select('crm_activities.*')
                ->where('crm_activities.deal_id', $id);
            
            // Only include non-deleted activities
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                $activitiesQuery->whereNull('crm_activities.deleted_at');
            }
            
            // Only join users if owner_id or user_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $activitiesQuery->leftJoin('users', 'crm_activities.owner_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                $activitiesQuery->leftJoin('users', 'crm_activities.user_id', '=', 'users.id')
                    ->addSelect('users.name as owner_name');
            }
            
            // Order by scheduled_at or due_date depending on what exists
            if ($this->hasColumn('crm_activities', 'scheduled_at')) {
                $activitiesQuery->orderBy('crm_activities.scheduled_at', 'desc');
            } elseif ($this->hasColumn('crm_activities', 'due_date')) {
                $activitiesQuery->orderBy('crm_activities.due_date', 'desc');
            } else {
                $activitiesQuery->orderBy('crm_activities.created_at', 'desc');
            }
            
            $activities = $activitiesQuery->get();
            
            // Transform activities - map due_date to scheduled_at if needed
            $activities->transform(function ($activity) {
                if (isset($activity->due_date) && !isset($activity->scheduled_at)) {
                    $activity->scheduled_at = $activity->due_date;
                }
                return $activity;
            });
            
            $deal->activities = $activities;

            return response()->json($deal);
        } catch (\Exception $e) {
            Log::error('Error in getDeal', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load deal',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeDeal(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'value' => 'required|numeric|min:0',
                'currency' => 'nullable|string|max:10',
                'stage' => 'required|string|max:50',
                'pipeline' => 'nullable|string|max:50',
                'probability' => 'nullable|integer|min:0|max:100',
                'company_id' => 'nullable|exists:crm_companies,id',
                'contact_id' => 'nullable|exists:crm_contacts,id',
                'expected_close_date' => 'nullable|date',
                'actual_close_date' => 'nullable|date',
                'description' => 'nullable|string',
                'source' => 'nullable|in:web,referral,campaign,manual,cold_call',
                'campaign_id' => 'nullable|string|max:100',
                'project_id' => 'nullable|exists:projects,id',
                'lost_reason' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['currency', 'pipeline', 'company_id', 'contact_id', 'expected_close_date', 
                             'actual_close_date', 'description', 'source', 'campaign_id', 'project_id', 
                             'lost_reason', 'owner_id'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Set default values if not provided
            if (!isset($data['currency'])) {
                $data['currency'] = 'BAM';
            }
            if (!isset($data['probability'])) {
                $data['probability'] = 0;
            }
            if (!isset($data['pipeline']) && $this->hasColumn('crm_deals', 'pipeline')) {
                $data['pipeline'] = 'sales';
            }
            if (!isset($data['source']) && $this->hasColumn('crm_deals', 'source')) {
                $data['source'] = 'manual';
            }
            
            // Calculate estimated_revenue if columns exist
            if ($this->hasColumn('crm_deals', 'estimated_revenue') && isset($data['value']) && isset($data['probability'])) {
                $data['estimated_revenue'] = ($data['value'] * $data['probability']) / 100;
            }
            
            // Only set created_by if column exists
            if ($this->hasColumn('crm_deals', 'created_by')) {
                $data['created_by'] = $user->id;
            }
            
            // Only set owner_id if column exists
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $data['owner_id'] = $data['owner_id'] ?? $user->id;
            }
            
            $data['created_at'] = now();
            $data['updated_at'] = now();
            
            // Remove fields that don't exist in database
            $allowedColumns = ['title', 'company_id', 'contact_id', 'value', 'currency', 'stage', 'pipeline', 
                              'probability', 'estimated_revenue', 'expected_close_date', 'actual_close_date', 
                              'lost_reason', 'source', 'campaign_id', 'description', 'owner_id', 'created_by', 
                              'project_id', 'created_at', 'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_deals', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));

            $dealId = DB::table('crm_deals')->insertGetId($data);

            $dealQuery = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->leftJoin('crm_companies', 'crm_deals.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $dealQuery->leftJoin('crm_contacts', 'crm_deals.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $dealQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                     'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $dealQuery->addSelect('crm_contacts.name as contact_name');
            }
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $dealQuery->leftJoin('users as owner', 'crm_deals.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            $deal = $dealQuery->where('crm_deals.id', $dealId)->first();
            
            // Transform contact data if needed
            if ($deal && $this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($deal->contact_name)) {
                    $nameParts = $this->splitNameForResponse($deal->contact_name);
                    $deal->contact_first_name = $nameParts['first'];
                    $deal->contact_last_name = $nameParts['last'];
                    unset($deal->contact_name);
                }
            }

            return response()->json($deal, 201);
        } catch (\Exception $e) {
            Log::error('Error in storeDeal', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to create deal',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateDeal(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'value' => 'required|numeric|min:0',
                'currency' => 'nullable|string|max:10',
                'stage' => 'required|string|max:50',
                'pipeline' => 'nullable|string|max:50',
                'probability' => 'nullable|integer|min:0|max:100',
                'company_id' => 'nullable|exists:crm_companies,id',
                'contact_id' => 'nullable|exists:crm_contacts,id',
                'expected_close_date' => 'nullable|date',
                'actual_close_date' => 'nullable|date',
                'description' => 'nullable|string',
                'source' => 'nullable|in:web,referral,campaign,manual,cold_call',
                'campaign_id' => 'nullable|string|max:100',
                'project_id' => 'nullable|exists:projects,id',
                'lost_reason' => 'nullable|string',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['currency', 'pipeline', 'company_id', 'contact_id', 'expected_close_date', 
                             'actual_close_date', 'description', 'source', 'campaign_id', 'project_id', 
                             'lost_reason', 'owner_id'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Calculate estimated_revenue if columns exist
            if ($this->hasColumn('crm_deals', 'estimated_revenue') && isset($data['value']) && isset($data['probability'])) {
                $data['estimated_revenue'] = ($data['value'] * $data['probability']) / 100;
            }

            // If deal is closed, set actual_close_date
            if (in_array($data['stage'], ['closed-won', 'closed-lost']) && !isset($data['actual_close_date']) && $this->hasColumn('crm_deals', 'actual_close_date')) {
                $data['actual_close_date'] = now();
            }
            
            $data['updated_at'] = now();
            
            // Remove fields that don't exist in database
            $allowedColumns = ['title', 'company_id', 'contact_id', 'value', 'currency', 'stage', 'pipeline', 
                              'probability', 'estimated_revenue', 'expected_close_date', 'actual_close_date', 
                              'lost_reason', 'source', 'campaign_id', 'description', 'owner_id', 
                              'project_id', 'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_deals', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));
            
            // Only update if deleted_at column exists
            $query = DB::table('crm_deals')->where('id', $id);
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }
            $query->update($data);

            $dealQuery = DB::table('crm_deals')
                ->select('crm_deals.*')
                ->leftJoin('crm_companies', 'crm_deals.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $dealQuery->leftJoin('crm_contacts', 'crm_deals.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $dealQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                     'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $dealQuery->addSelect('crm_contacts.name as contact_name');
            }
            
            // Only join users if owner_id column exists
            if ($this->hasColumn('crm_deals', 'owner_id')) {
                $dealQuery->leftJoin('users as owner', 'crm_deals.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            $deal = $dealQuery->where('crm_deals.id', $id)->first();
            
            // Transform contact data if needed
            if ($deal && $this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($deal->contact_name)) {
                    $nameParts = $this->splitNameForResponse($deal->contact_name);
                    $deal->contact_first_name = $nameParts['first'];
                    $deal->contact_last_name = $nameParts['last'];
                    unset($deal->contact_name);
                }
            }

            return response()->json($deal);
        } catch (\Exception $e) {
            Log::error('Error in updateDeal', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to update deal',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteDeal(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if deal exists
            $dealQuery = DB::table('crm_deals')->where('id', $id);
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $dealQuery->whereNull('deleted_at');
            }
            $deal = $dealQuery->first();
            
            if (!$deal) {
                return response()->json(['error' => 'Deal not found'], 404);
            }

            // Soft delete if column exists, otherwise hard delete
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                DB::table('crm_deals')
                    ->where('id', $id)
                    ->update(['deleted_at' => now()]);
            } else {
                DB::table('crm_deals')
                    ->where('id', $id)
                    ->delete();
            }

            return response()->json(['message' => 'Deal deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteDeal', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to delete deal'], 500);
        }
    }

    // ==================== ACTIVITIES ====================

    public function getActivities(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['data' => [], 'total' => 0]);
            }

            $query = DB::table('crm_activities')
                ->select('crm_activities.*')
                ->leftJoin('crm_companies', 'crm_activities.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $query->leftJoin('crm_contacts', 'crm_activities.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $query->addSelect('crm_contacts.first_name as contact_first_name', 
                                 'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $query->addSelect('crm_contacts.name as contact_name');
            }
            
            $query->leftJoin('crm_deals', 'crm_activities.deal_id', '=', 'crm_deals.id')
                ->addSelect('crm_deals.title as deal_title');
            
            // Only join users if owner_id or user_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $query->leftJoin('users as owner', 'crm_activities.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                $query->leftJoin('users as owner', 'crm_activities.user_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            // Only join creator if created_by column exists
            if ($this->hasColumn('crm_activities', 'created_by')) {
                $query->leftJoin('users as creator', 'crm_activities.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                $query->whereNull('crm_activities.deleted_at');
            }
            
            // Order by scheduled_at or due_date depending on what exists
            if ($this->hasColumn('crm_activities', 'scheduled_at')) {
                $query->orderBy('crm_activities.scheduled_at', 'desc');
            } elseif ($this->hasColumn('crm_activities', 'due_date')) {
                $query->orderBy('crm_activities.due_date', 'desc');
            } else {
                $query->orderBy('crm_activities.created_at', 'desc');
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('crm_activities.type', $request->input('type'));
            }

            // Filter by company
            if ($request->has('company_id')) {
                $query->where('crm_activities.company_id', $request->input('company_id'));
            }

            // Filter by contact
            if ($request->has('contact_id')) {
                $query->where('crm_activities.contact_id', $request->input('contact_id'));
            }

            // Filter by deal
            if ($request->has('deal_id')) {
                $query->where('crm_activities.deal_id', $request->input('deal_id'));
            }

            // Filter by date range - handle both scheduled_at and due_date
            if ($request->has('start_date')) {
                $dateColumn = $this->hasColumn('crm_activities', 'scheduled_at') ? 'scheduled_at' : 'due_date';
                if ($dateColumn) {
                    $query->where('crm_activities.' . $dateColumn, '>=', $request->input('start_date'));
                }
            }
            if ($request->has('end_date')) {
                $dateColumn = $this->hasColumn('crm_activities', 'scheduled_at') ? 'scheduled_at' : 'due_date';
                if ($dateColumn) {
                    $query->where('crm_activities.' . $dateColumn, '<=', $request->input('end_date'));
                }
            }

            // Filter completed/incomplete - handle both completed_at and completed
            if ($request->has('completed')) {
                if ($request->input('completed') == 'true') {
                    if ($this->hasColumn('crm_activities', 'completed_at')) {
                        $query->whereNotNull('crm_activities.completed_at');
                    } elseif ($this->hasColumn('crm_activities', 'completed')) {
                        $query->where('crm_activities.completed', 1);
                    } elseif ($this->hasColumn('crm_activities', 'status')) {
                        $query->where('crm_activities.status', 'completed');
                    }
                } else {
                    if ($this->hasColumn('crm_activities', 'completed_at')) {
                        $query->whereNull('crm_activities.completed_at');
                    } elseif ($this->hasColumn('crm_activities', 'completed')) {
                        $query->where('crm_activities.completed', 0);
                    } elseif ($this->hasColumn('crm_activities', 'status')) {
                        $query->where('crm_activities.status', '!=', 'completed');
                    }
                }
            }
            
            // Search functionality
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('crm_activities.subject', 'like', "%{$search}%")
                      ->orWhere('crm_activities.description', 'like', "%{$search}%")
                      ->orWhere('crm_companies.name', 'like', "%{$search}%")
                      ->orWhere('crm_deals.title', 'like', "%{$search}%");
                });
            }

            $activities = $query->paginate($request->input('per_page', 15));
            
            // Transform response to match frontend expectations
            // If table has 'name' but frontend expects 'first_name'/'last_name', split it
            if ($this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                $activities->getCollection()->transform(function ($activity) {
                    if (isset($activity->contact_name) && !isset($activity->contact_first_name)) {
                        $nameParts = $this->splitNameForResponse($activity->contact_name);
                        $activity->contact_first_name = $nameParts['first'];
                        $activity->contact_last_name = $nameParts['last'];
                        unset($activity->contact_name);
                    }
                    // Map due_date to scheduled_at if needed
                    if (isset($activity->due_date) && !isset($activity->scheduled_at)) {
                        $activity->scheduled_at = $activity->due_date;
                    }
                    return $activity;
                });
            } else {
                // Still map due_date to scheduled_at if needed
                $activities->getCollection()->transform(function ($activity) {
                    if (isset($activity->due_date) && !isset($activity->scheduled_at)) {
                        $activity->scheduled_at = $activity->due_date;
                    }
                    return $activity;
                });
            }

            return response()->json($activities);
        } catch (\Exception $e) {
            Log::error('Error in getActivities', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load activities',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getActivity(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $activity = DB::table('crm_activities')
                ->select(
                    'crm_activities.*',
                    'crm_companies.name as company_name',
                    'crm_contacts.first_name as contact_first_name',
                    'crm_contacts.last_name as contact_last_name',
                    'crm_deals.title as deal_title',
                    'owner.name as owner_name',
                    'creator.name as created_by_name'
                )
                ->leftJoin('crm_companies', 'crm_activities.company_id', '=', 'crm_companies.id')
                ->leftJoin('crm_contacts', 'crm_activities.contact_id', '=', 'crm_contacts.id')
                ->leftJoin('crm_deals', 'crm_activities.deal_id', '=', 'crm_deals.id')
                ->leftJoin('users as owner', 'crm_activities.owner_id', '=', 'owner.id')
                ->leftJoin('users as creator', 'crm_activities.created_by', '=', 'creator.id')
                ->where('crm_activities.id', $id)
                ->whereNull('crm_activities.deleted_at')
                ->first();

            if (!$activity) {
                return response()->json(['error' => 'Activity not found'], 404);
            }

            return response()->json($activity);
        } catch (\Exception $e) {
            Log::error('Error in getActivity', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to load activity'], 500);
        }
    }

    public function storeActivity(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'required|in:call,meeting,email,task,note',
                'subject' => 'required|string|max:255',
                'description' => 'nullable|string',
                'company_id' => 'nullable|exists:crm_companies,id',
                'contact_id' => 'nullable|exists:crm_contacts,id',
                'deal_id' => 'nullable|exists:crm_deals,id',
                'scheduled_at' => 'nullable|date',
                'duration' => 'nullable|integer|min:1',
                'location' => 'nullable|string|max:255',
                'attendees' => 'nullable|array',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Map scheduled_at to due_date if table has due_date but not scheduled_at
            if (isset($data['scheduled_at']) && !$this->hasColumn('crm_activities', 'scheduled_at') && $this->hasColumn('crm_activities', 'due_date')) {
                $data['due_date'] = $data['scheduled_at'];
                unset($data['scheduled_at']);
            }
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['description', 'company_id', 'contact_id', 'deal_id', 'scheduled_at', 'due_date', 
                             'duration', 'location', 'owner_id', 'user_id'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Set default values if not provided
            if (!isset($data['status']) && $this->hasColumn('crm_activities', 'status')) {
                $data['status'] = 'scheduled';
            }
            if (!isset($data['completed']) && $this->hasColumn('crm_activities', 'completed')) {
                $data['completed'] = 0;
            }
            
            // Only set created_by if column exists
            if ($this->hasColumn('crm_activities', 'created_by')) {
                $data['created_by'] = $user->id;
            }
            
            // Handle owner_id/user_id - some tables use user_id instead of owner_id
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $data['owner_id'] = $data['owner_id'] ?? $user->id;
                unset($data['user_id']);
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                if (!isset($data['user_id'])) {
                    $data['user_id'] = isset($data['owner_id']) ? $data['owner_id'] : $user->id;
                }
                unset($data['owner_id']);
            }
            
            // Handle attendees JSON if column exists
            if ($this->hasColumn('crm_activities', 'attendees') && isset($data['attendees'])) {
                if (is_array($data['attendees'])) {
                    $data['attendees'] = json_encode($data['attendees']);
                }
            } else {
                unset($data['attendees']);
            }
            
            $data['created_at'] = now();
            $data['updated_at'] = now();
            
            // Remove fields that don't exist in database
            $allowedColumns = ['type', 'subject', 'description', 'company_id', 'contact_id', 'deal_id', 
                              'scheduled_at', 'due_date', 'completed_at', 'completed', 'duration', 
                              'location', 'attendees', 'status', 'related_entity_type', 
                              'related_entity_id', 'owner_id', 'user_id', 'created_by', 
                              'created_at', 'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_activities', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));

            $activityId = DB::table('crm_activities')->insertGetId($data);

            $activityQuery = DB::table('crm_activities')
                ->select('crm_activities.*')
                ->leftJoin('crm_companies', 'crm_activities.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $activityQuery->leftJoin('crm_contacts', 'crm_activities.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $activityQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                         'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $activityQuery->addSelect('crm_contacts.name as contact_name');
            }
            
            $activityQuery->leftJoin('crm_deals', 'crm_activities.deal_id', '=', 'crm_deals.id')
                ->addSelect('crm_deals.title as deal_title');
            
            // Only join users if owner_id or user_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $activityQuery->leftJoin('users as owner', 'crm_activities.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                $activityQuery->leftJoin('users as owner', 'crm_activities.user_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            $activity = $activityQuery->where('crm_activities.id', $activityId)->first();
            
            // Transform contact data if needed
            if ($activity && $this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($activity->contact_name)) {
                    $nameParts = $this->splitNameForResponse($activity->contact_name);
                    $activity->contact_first_name = $nameParts['first'];
                    $activity->contact_last_name = $nameParts['last'];
                    unset($activity->contact_name);
                }
            }

            return response()->json($activity, 201);
        } catch (\Exception $e) {
            Log::error('Error in storeActivity', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to create activity',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateActivity(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'required|in:call,meeting,email,task,note',
                'subject' => 'required|string|max:255',
                'description' => 'nullable|string',
                'company_id' => 'nullable|exists:crm_companies,id',
                'contact_id' => 'nullable|exists:crm_contacts,id',
                'deal_id' => 'nullable|exists:crm_deals,id',
                'scheduled_at' => 'nullable|date',
                'completed_at' => 'nullable|date',
                'duration' => 'nullable|integer|min:1',
                'location' => 'nullable|string|max:255',
                'attendees' => 'nullable|array',
                'owner_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Map scheduled_at to due_date if table has due_date but not scheduled_at
            if (isset($data['scheduled_at']) && !$this->hasColumn('crm_activities', 'scheduled_at') && $this->hasColumn('crm_activities', 'due_date')) {
                $data['due_date'] = $data['scheduled_at'];
                unset($data['scheduled_at']);
            }
            
            // Convert empty strings to null for nullable fields
            $nullableFields = ['description', 'company_id', 'contact_id', 'deal_id', 'scheduled_at', 'due_date', 
                             'duration', 'location', 'owner_id', 'user_id'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Handle attendees JSON if column exists
            if ($this->hasColumn('crm_activities', 'attendees') && isset($data['attendees'])) {
                if (is_array($data['attendees'])) {
                    $data['attendees'] = json_encode($data['attendees']);
                }
            } else {
                unset($data['attendees']);
            }
            
            // Handle owner_id/user_id mapping
            if ($this->hasColumn('crm_activities', 'user_id') && !$this->hasColumn('crm_activities', 'owner_id')) {
                if (isset($data['owner_id'])) {
                    $data['user_id'] = $data['owner_id'];
                    unset($data['owner_id']);
                }
            }
            
            $data['updated_at'] = now();
            
            // Remove fields that don't exist in database
            $allowedColumns = ['type', 'subject', 'description', 'company_id', 'contact_id', 'deal_id', 
                              'scheduled_at', 'due_date', 'completed_at', 'completed', 'duration', 
                              'location', 'attendees', 'status', 'related_entity_type', 
                              'related_entity_id', 'owner_id', 'user_id', 'updated_at'];
            
            // Filter to only include columns that actually exist
            $existingColumns = [];
            foreach ($allowedColumns as $column) {
                if ($this->hasColumn('crm_activities', $column)) {
                    $existingColumns[] = $column;
                }
            }
            
            $data = array_intersect_key($data, array_flip($existingColumns));
            
            // Only update if deleted_at column exists
            $query = DB::table('crm_activities')->where('id', $id);
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }
            $query->update($data);

            $activityQuery = DB::table('crm_activities')
                ->select('crm_activities.*')
                ->leftJoin('crm_companies', 'crm_activities.company_id', '=', 'crm_companies.id')
                ->addSelect('crm_companies.name as company_name');
            
            // Join contacts - handle both name structures
            $activityQuery->leftJoin('crm_contacts', 'crm_activities.contact_id', '=', 'crm_contacts.id');
            if ($this->hasColumn('crm_contacts', 'first_name')) {
                $activityQuery->addSelect('crm_contacts.first_name as contact_first_name', 
                                         'crm_contacts.last_name as contact_last_name');
            } elseif ($this->hasColumn('crm_contacts', 'name')) {
                $activityQuery->addSelect('crm_contacts.name as contact_name');
            }
            
            $activityQuery->leftJoin('crm_deals', 'crm_activities.deal_id', '=', 'crm_deals.id')
                ->addSelect('crm_deals.title as deal_title');
            
            // Only join users if owner_id or user_id column exists
            if ($this->hasColumn('crm_activities', 'owner_id')) {
                $activityQuery->leftJoin('users as owner', 'crm_activities.owner_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            } elseif ($this->hasColumn('crm_activities', 'user_id')) {
                $activityQuery->leftJoin('users as owner', 'crm_activities.user_id', '=', 'owner.id')
                    ->addSelect('owner.name as owner_name');
            }
            
            $activity = $activityQuery->where('crm_activities.id', $id)->first();
            
            // Transform contact data if needed
            if ($activity && $this->hasColumn('crm_contacts', 'name') && !$this->hasColumn('crm_contacts', 'first_name')) {
                if (isset($activity->contact_name)) {
                    $nameParts = $this->splitNameForResponse($activity->contact_name);
                    $activity->contact_first_name = $nameParts['first'];
                    $activity->contact_last_name = $nameParts['last'];
                    unset($activity->contact_name);
                }
            }

            return response()->json($activity);
        } catch (\Exception $e) {
            Log::error('Error in updateActivity', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to update activity',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteActivity(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            // Check if activity exists
            $activityQuery = DB::table('crm_activities')->where('id', $id);
            
            // Only filter by deleted_at if column exists
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                $activityQuery->whereNull('deleted_at');
            }
            
            $activity = $activityQuery->first();
            if (!$activity) {
                return response()->json(['error' => 'Activity not found'], 404);
            }

            // Soft delete if column exists, otherwise hard delete
            if ($this->hasColumn('crm_activities', 'deleted_at')) {
                DB::table('crm_activities')
                    ->where('id', $id)
                    ->update(['deleted_at' => now()]);
            } else {
                DB::table('crm_activities')
                    ->where('id', $id)
                    ->delete();
            }

            return response()->json(['message' => 'Activity deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteActivity', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to delete activity'], 500);
        }
    }

    public function completeActivity(Request $request, $id)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            DB::table('crm_activities')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->update([
                    'completed_at' => now(),
                    'updated_at' => now(),
                ]);

            $activity = DB::table('crm_activities')
                ->select(
                    'crm_activities.*',
                    'crm_companies.name as company_name',
                    'crm_contacts.first_name as contact_first_name',
                    'crm_contacts.last_name as contact_last_name',
                    'owner.name as owner_name'
                )
                ->leftJoin('crm_companies', 'crm_activities.company_id', '=', 'crm_companies.id')
                ->leftJoin('crm_contacts', 'crm_activities.contact_id', '=', 'crm_contacts.id')
                ->leftJoin('users as owner', 'crm_activities.owner_id', '=', 'owner.id')
                ->where('crm_activities.id', $id)
                ->first();

            return response()->json($activity);
        } catch (\Exception $e) {
            Log::error('Error in completeActivity', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['error' => 'Failed to complete activity'], 500);
        }
    }

    // ==================== TAGS ====================

    public function getTags(Request $request)
    {
        try {
            $query = Tag::query();

            if ($request->has('module')) {
                $query->where('module', $request->input('module'));
            }

            $tags = $query->orderBy('name')->get();
            return response()->json($tags);
        } catch (\Exception $e) {
            Log::error('Error in getTags', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load tags'], 500);
        }
    }

    public function storeTag(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:crm_tags,name',
                'color' => 'nullable|string|max:20',
                'module' => 'nullable|string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $tag = Tag::create($validator->validated());
            return response()->json($tag, 201);
        } catch (\Exception $e) {
            Log::error('Error in storeTag', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create tag'], 500);
        }
    }

    public function attachTag(Request $request, string $entityType, int $entityId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'tag_id' => 'required|exists:crm_tags,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $model = $this->getEntityModel($entityType);
            if (!$model) {
                return response()->json(['error' => 'Invalid entity type'], 400);
            }

            $entity = $model::findOrFail($entityId);
            $entity->tags()->syncWithoutDetaching([
                $request->input('tag_id') => ['entity_type' => $entityType]
            ]);

            return response()->json(['message' => 'Tag attached successfully']);
        } catch (\Exception $e) {
            Log::error('Error in attachTag', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to attach tag'], 500);
        }
    }

    public function detachTag(Request $request, string $entityType, int $entityId, int $tagId)
    {
        try {
            $model = $this->getEntityModel($entityType);
            if (!$model) {
                return response()->json(['error' => 'Invalid entity type'], 400);
            }

            $entity = $model::findOrFail($entityId);
            $entity->tags()->detach($tagId);

            return response()->json(['message' => 'Tag detached successfully']);
        } catch (\Exception $e) {
            Log::error('Error in detachTag', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to detach tag'], 500);
        }
    }

    // ==================== DOCUMENTS ====================

    public function getDocuments(Request $request, string $entityType, int $entityId)
    {
        try {
            $documents = Document::where('entity_type', $entityType)
                ->where('entity_id', $entityId)
                ->with('uploader')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($documents);
        } catch (\Exception $e) {
            Log::error('Error in getDocuments', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load documents'], 500);
        }
    }

    public function uploadDocument(Request $request, string $entityType, int $entityId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:10240', // 10MB max
                'file_type' => 'nullable|string|max:50',
                'name' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $file = $request->file('file');
            $path = $file->store('crm/documents', 'public');

            $document = Document::create([
                'name' => $request->input('name') ?? $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => $request->input('file_type'),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'uploaded_by' => $request->user()->id,
                'uploaded_at' => now(),
            ]);

            return response()->json($document, 201);
        } catch (\Exception $e) {
            Log::error('Error in uploadDocument', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to upload document'], 500);
        }
    }

    public function downloadDocument(Request $request, int $id)
    {
        try {
            $document = Document::findOrFail($id);
            
            if (!Storage::disk('public')->exists($document->file_path)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            return Storage::disk('public')->download($document->file_path, $document->name);
        } catch (\Exception $e) {
            Log::error('Error in downloadDocument', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to download document'], 500);
        }
    }

    public function deleteDocument(Request $request, int $id)
    {
        try {
            $document = Document::findOrFail($id);
            
            // Obriši fajl
            if (Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }

            $document->delete();
            return response()->json(['message' => 'Document deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error in deleteDocument', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete document'], 500);
        }
    }


    // ==================== INTEGRATIONS ====================

    public function createProjectFromDeal(Request $request, int $dealId)
    {
        try {
            $deal = Deal::findOrFail($dealId);

            if ($deal->project_id) {
                return response()->json(['error' => 'Deal already has a project'], 400);
            }

            $workflowService = new CrmWorkflowService();
            $project = $workflowService->createProjectFromDeal($deal);

            if (!$project) {
                return response()->json(['error' => 'Failed to create project'], 500);
            }

            return response()->json($project, 201);
        } catch (\Exception $e) {
            Log::error('Error in createProjectFromDeal', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create project'], 500);
        }
    }

    public function getDealTasks(Request $request, int $dealId)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            // Check if deal exists
            $deal = DB::table('crm_deals')->where('id', $dealId)->first();
            if (!$deal) {
                return response()->json(['error' => 'Deal not found'], 404);
            }

            // Check if crm_deal_tasks table exists
            if (!Schema::hasTable('crm_deal_tasks')) {
                // If table doesn't exist, return empty array
                return response()->json([]);
            }

            // Get tasks linked to this deal via crm_deal_tasks pivot table
            $tasksQuery = DB::table('crm_deal_tasks')
                ->join('tasks', 'crm_deal_tasks.task_id', '=', 'tasks.id')
                ->select('tasks.*', 'crm_deal_tasks.task_type')
                ->where('crm_deal_tasks.deal_id', $dealId);
            
            // Only include non-deleted tasks
            if (Schema::hasColumn('tasks', 'deleted_at')) {
                $tasksQuery->whereNull('tasks.deleted_at');
            }
            
            // Join assigned user if column exists
            if (Schema::hasColumn('tasks', 'assigned_to')) {
                $tasksQuery->leftJoin('users as assignee', 'tasks.assigned_to', '=', 'assignee.id')
                    ->addSelect('assignee.name as assigned_to_name');
            } elseif (Schema::hasColumn('tasks', 'assigned_to_id')) {
                $tasksQuery->leftJoin('users as assignee', 'tasks.assigned_to_id', '=', 'assignee.id')
                    ->addSelect('assignee.name as assigned_to_name');
            }
            
            // Join project if project_id exists
            if (Schema::hasColumn('tasks', 'project_id')) {
                $tasksQuery->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
                    ->addSelect('projects.name as project_name', 'projects.id as project_id');
            }
            
            $tasks = $tasksQuery->get();

            return response()->json($tasks);
        } catch (\Exception $e) {
            Log::error('Error in getDealTasks', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load tasks',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function createTaskForDeal(Request $request, int $dealId)
    {
        try {
            $deal = Deal::findOrFail($dealId);

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'priority' => 'nullable|in:low,medium,high,urgent',
                'due_date' => 'nullable|date',
                'assigned_to' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $task = Task::create([
                'project_id' => $deal->project_id,
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'status' => 'todo',
                'priority' => $request->input('priority', 'medium'),
                'assigned_to' => $request->input('assigned_to') ?? $deal->owner_id,
                'due_date' => $request->input('due_date'),
                'created_by' => $request->user()->id,
            ]);

            $deal->tasks()->attach($task->id, [
                'task_type' => $request->input('task_type', 'follow_up'),
            ]);

            return response()->json($task, 201);
        } catch (\Exception $e) {
            Log::error('Error in createTaskForDeal', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create task'], 500);
        }
    }

    // ==================== TIMELINE ====================

    public function getTimeline(Request $request, string $entityType, int $entityId)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }
            
            $workflowService = new CrmWorkflowService();
            $timeline = $workflowService->getTimeline($entityType, $entityId);

            return response()->json($timeline);
        } catch (\Exception $e) {
            Log::error('Error in getTimeline', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load timeline',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== REPORTING & ANALYTICS ====================

    public function getFunnelReport(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $pipeline = $request->input('pipeline', 'sales');
            
            // Get stages from crm_deal_stages if table exists, otherwise use default stages
            $stages = [];
            if (Schema::hasTable('crm_deal_stages') && Schema::hasTable('crm_pipelines')) {
                $pipelineRecord = DB::table('crm_pipelines')->where('name', $pipeline)->first();
                if ($pipelineRecord) {
                    $stages = DB::table('crm_deal_stages')
                        ->where('pipeline_id', $pipelineRecord->id)
                        ->orderBy('sort_order')
                        ->get()
                        ->toArray();
                }
            }
            
            // If no stages found, use default stages
            if (empty($stages)) {
                $stages = [
                    (object)['name' => 'Lead', 'stage_key' => 'lead', 'sort_order' => 1],
                    (object)['name' => 'Qualified', 'stage_key' => 'qualified', 'sort_order' => 2],
                    (object)['name' => 'Proposal', 'stage_key' => 'proposal', 'sort_order' => 3],
                    (object)['name' => 'Negotiation', 'stage_key' => 'negotiation', 'sort_order' => 4],
                    (object)['name' => 'Closed Won', 'stage_key' => 'closed-won', 'sort_order' => 5],
                    (object)['name' => 'Closed Lost', 'stage_key' => 'closed-lost', 'sort_order' => 6],
                ];
            }

            $funnel = [];
            foreach ($stages as $stage) {
                $dealsQuery = DB::table('crm_deals')->where('stage', $stage->stage_key);
                
                // Filter by pipeline if column exists
                if ($this->hasColumn('crm_deals', 'pipeline')) {
                    $dealsQuery->where('pipeline', $pipeline);
                }
                
                // Only include non-deleted deals
                if ($this->hasColumn('crm_deals', 'deleted_at')) {
                    $dealsQuery->whereNull('deleted_at');
                }
                
                $deals = $dealsQuery->get();
                
                $totalValue = $deals->sum('value') ?? 0;
                $estimatedRevenue = 0;
                
                // Calculate estimated_revenue if column exists, otherwise calculate from value * probability
                if ($this->hasColumn('crm_deals', 'estimated_revenue')) {
                    $estimatedRevenue = $deals->sum('estimated_revenue') ?? 0;
                } else {
                    foreach ($deals as $deal) {
                        $probability = $deal->probability ?? 0;
                        $value = $deal->value ?? 0;
                        $estimatedRevenue += ($value * $probability) / 100;
                    }
                }

                $funnel[] = [
                    'stage' => $stage->name,
                    'stage_key' => $stage->stage_key,
                    'count' => $deals->count(),
                    'total_value' => $totalValue,
                    'estimated_revenue' => $estimatedRevenue,
                ];
            }

            return response()->json($funnel);
        } catch (\Exception $e) {
            Log::error('Error in getFunnelReport', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load funnel report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getDealPerformance(Request $request)
    {
        try {
            if (!$this->checkCRMTables()) {
                return response()->json(['error' => 'CRM tables do not exist'], 500);
            }

            $userId = $request->input('user_id');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            $query = DB::table('crm_deals');

            // Filter by owner_id or user_id depending on what exists
            if ($userId) {
                if ($this->hasColumn('crm_deals', 'owner_id')) {
                    $query->where('owner_id', $userId);
                } elseif ($this->hasColumn('crm_deals', 'user_id')) {
                    $query->where('user_id', $userId);
                }
            }

            if ($startDate) {
                $query->where('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->where('created_at', '<=', $endDate);
            }
            
            // Only include non-deleted deals
            if ($this->hasColumn('crm_deals', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }

            $deals = $query->get();

            $totalDeals = $deals->count();
            $wonDeals = $deals->where('stage', 'closed-won')->count();
            $lostDeals = $deals->where('stage', 'closed-lost')->count();
            $openDeals = $totalDeals - $wonDeals - $lostDeals;
            
            $totalValue = $deals->sum('value') ?? 0;
            $wonValue = $deals->where('stage', 'closed-won')->sum('value') ?? 0;
            
            // Calculate pipeline_value from estimated_revenue or calculate it
            $pipelineValue = 0;
            if ($this->hasColumn('crm_deals', 'estimated_revenue')) {
                $pipelineValue = $deals->whereNotIn('stage', ['closed-won', 'closed-lost'])->sum('estimated_revenue') ?? 0;
            } else {
                foreach ($deals as $deal) {
                    if (!in_array($deal->stage ?? '', ['closed-won', 'closed-lost'])) {
                        $probability = $deal->probability ?? 0;
                        $value = $deal->value ?? 0;
                        $pipelineValue += ($value * $probability) / 100;
                    }
                }
            }
            
            $winRate = $totalDeals > 0 ? ($wonDeals / $totalDeals) * 100 : 0;

            $performance = [
                'total_deals' => $totalDeals,
                'won_deals' => $wonDeals,
                'lost_deals' => $lostDeals,
                'open_deals' => $openDeals,
                'total_value' => $totalValue,
                'won_value' => $wonValue,
                'pipeline_value' => $pipelineValue,
                'win_rate' => round($winRate, 2),
            ];

            return response()->json($performance);
        } catch (\Exception $e) {
            Log::error('Error in getDealPerformance', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load performance',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== AUDIT LOGS ====================

    public function getAuditLogs(Request $request, string $entityType, int $entityId)
    {
        try {
            $logs = AuditLog::where('entity_type', $entityType)
                ->where('entity_id', $entityId)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->paginate($request->input('per_page', 20));

            return response()->json($logs);
        } catch (\Exception $e) {
            Log::error('Error in getAuditLogs', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load audit logs'], 500);
        }
    }

    // ==================== HELPER METHODS ====================

    private function getEntityModel(string $entityType): ?string
    {
        return match ($entityType) {
            'account' => Account::class,
            'contact' => Contact::class,
            'deal' => Deal::class,
            default => null,
        };
    }
}
