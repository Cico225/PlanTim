<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminController extends Controller
{
    // ==================== USERS ====================

    /**
     * Get all users
     */
    public function getUsers(Request $request)
    {
        $query = \App\Models\User::query()
            ->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->input('is_active'));
        }

        // Filter by role if provided
        if ($request->has('role') && $request->input('role')) {
            $query->role($request->input('role'));
        }

        // Paginate and load roles
        $users = $query->paginate(20);
        
        // Transform users to include roles as array of names
        $users->getCollection()->transform(function ($user) {
            $userArray = $user->toArray();
            $userArray['roles'] = $user->getRoleNames()->toArray();
            $userArray['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
            return $userArray;
        });

        return response()->json($users);
    }

    /**
     * Create user
     */
    public function createUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'nullable|string|exists:roles,name',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = DB::table('users')->insertGetId([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'is_active' => $request->input('is_active', true),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Assign role if provided
        if ($request->has('role')) {
            $user = \App\Models\User::find($userId);
            $user->assignRole($request->input('role'));
        }

        $user = DB::table('users')->find($userId);

        // Log activity
        if (auth()->check()) {
            $userModel = \App\Models\User::find($userId);
            if ($userModel) {
                activity('user')
                    ->causedBy(auth()->user())
                    ->performedOn($userModel)
                    ->withProperties([
                        'name' => $request->input('name'),
                        'email' => $request->input('email'),
                        'is_active' => $request->input('is_active', true),
                        'role' => $request->input('role'),
                    ])
                    ->log('created user');
            }
        }

        return response()->json($user, 201);
    }

    /**
     * Update user
     */
    public function updateUser(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = [
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'is_active' => $request->input('is_active', true),
            'updated_at' => now(),
        ];

        if ($request->has('password') && $request->input('password')) {
            $updateData['password'] = Hash::make($request->input('password'));
        }

        DB::table('users')->where('id', $id)->update($updateData);

        $user = DB::table('users')->find($id);

        // Log activity
        if (auth()->check()) {
            $userModel = \App\Models\User::find($id);
            if ($userModel) {
                activity('user')
                    ->causedBy(auth()->user())
                    ->performedOn($userModel)
                    ->withProperties([
                        'name' => $request->input('name'),
                        'email' => $request->input('email'),
                        'is_active' => $request->input('is_active', true),
                        'password_changed' => $request->has('password') && $request->input('password'),
                    ])
                    ->log('updated user');
            }
        }

        return response()->json($user);
    }

    /**
     * Delete user
     */
    public function deleteUser($id)
    {
        // Prevent deleting own account
        if (auth()->id() == $id) {
            return response()->json(['message' => 'Cannot delete your own account'], 422);
        }

        // Get user data before deletion for logging
        $userToDelete = DB::table('users')->find($id);
        $userModel = \App\Models\User::find($id);

        DB::table('users')->where('id', $id)->delete();

        // Log activity
        if (auth()->check() && $userToDelete) {
            activity('user')
                ->causedBy(auth()->user())
                ->withProperties([
                    'deleted_user_id' => $id,
                    'deleted_user_name' => $userToDelete->name ?? 'Unknown',
                    'deleted_user_email' => $userToDelete->email ?? 'Unknown',
                ])
                ->log('deleted user');
        }

        return response()->json(['message' => 'User deleted successfully']);
    }

    // ==================== ROLES & PERMISSIONS ====================

    /**
     * Get all roles
     */
    public function getRoles()
    {
        try {
            // Get roles with permissions
            $roles = Role::all();
            
            // Load permissions separately to avoid issues
            foreach ($roles as $role) {
                try {
                    $role->load('permissions');
                } catch (\Exception $e) {
                    $role->permissions = [];
                }
            }
            
            // Manually count users for each role using model_has_roles table
            $roles = $roles->map(function ($role) {
                try {
                    $usersCount = DB::table('model_has_roles')
                        ->where('role_id', $role->id)
                        ->where('model_type', 'App\\Models\\User')
                        ->count();
                } catch (\Exception $e) {
                    $usersCount = 0;
                }
                
                $role->users_count = $usersCount;
                
                // Set is_system to false if column doesn't exist
                if (!isset($role->is_system)) {
                    $role->is_system = false;
                }
                
                return $role;
            });

            return response()->json($roles);
        } catch (\Exception $e) {
            \Log::error('Error fetching roles: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Greška pri učitavanju uloga',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create role
     */
    public function createRole(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Create role with is_system = false by default (user-created roles)
        $roleData = ['name' => $request->input('name')];
        
        // Only add is_system if column exists
        if (Schema::hasColumn('roles', 'is_system')) {
            $roleData['is_system'] = false;
        }
        
        $role = Role::create($roleData);

        if ($request->has('permissions') && is_array($request->input('permissions'))) {
            $role->givePermissionTo($request->input('permissions'));
        }

        // Log activity
        if (auth()->check()) {
            activity('role')
                ->causedBy(auth()->user())
                ->performedOn($role)
                ->withProperties([
                    'name' => $request->input('name'),
                    'permissions_count' => count($request->input('permissions', [])),
                    'permissions' => $request->input('permissions', []),
                ])
                ->log('created role');
        }

        return response()->json($role->load('permissions'), 201);
    }

    /**
     * Update role
     */
    public function updateRole(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role = Role::findById($id);
        
        // Protect system roles from name changes (only if is_system column exists)
        if (Schema::hasColumn('roles', 'is_system')) {
            if (isset($role->is_system) && $role->is_system && $role->name !== $request->input('name')) {
                return response()->json([
                    'message' => 'Cannot change name of system role. System roles are protected.'
                ], 422);
            }
        }

        $oldName = $role->name;
        $oldPermissions = $role->permissions->pluck('name')->toArray();
        
        $role->update(['name' => $request->input('name')]);

        if ($request->has('permissions')) {
            $role->syncPermissions($request->input('permissions'));
        }

        // Log activity
        if (auth()->check()) {
            $newPermissions = $request->has('permissions') ? $request->input('permissions') : $oldPermissions;
            activity('role')
                ->causedBy(auth()->user())
                ->performedOn($role)
                ->withProperties([
                    'old_name' => $oldName,
                    'new_name' => $request->input('name'),
                    'old_permissions' => $oldPermissions,
                    'new_permissions' => $newPermissions,
                    'permissions_changed' => $request->has('permissions'),
                ])
                ->log('updated role');
        }

        return response()->json($role->load('permissions'));
    }

    /**
     * Delete role
     */
    public function deleteRole($id)
    {
        $role = Role::findById($id);
        
        // Protect system roles from deletion (only if is_system column exists)
        if (Schema::hasColumn('roles', 'is_system')) {
            if (isset($role->is_system) && $role->is_system) {
                return response()->json([
                    'message' => 'Cannot delete system role. System roles are protected.'
                ], 422);
            }
        }
        
        // Check if role is in use
        $usersCount = $role->users()->count();
        if ($usersCount > 0) {
            return response()->json([
                'message' => "Cannot delete role. It is assigned to {$usersCount} user(s)."
            ], 422);
        }

        // Get role data before deletion for logging
        $roleName = $role->name;
        $roleId = $role->id;

        $role->delete();

        // Log activity
        if (auth()->check()) {
            activity('role')
                ->causedBy(auth()->user())
                ->withProperties([
                    'deleted_role_id' => $roleId,
                    'deleted_role_name' => $roleName,
                ])
                ->log('deleted role');
        }

        return response()->json(['message' => 'Role deleted successfully']);
    }

    /**
     * Get all permissions
     */
    public function getPermissions()
    {
        $permissions = Permission::all()->groupBy('module');

        return response()->json($permissions);
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, $userId)
    {
        $validator = Validator::make($request->all(), [
            'role' => 'required|string|exists:roles,name',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = \App\Models\User::findOrFail($userId);
        $oldRoles = $user->roles->pluck('name')->toArray();
        $user->syncRoles([$request->input('role')]);

        // Log activity
        if (auth()->check()) {
            activity('role')
                ->causedBy(auth()->user())
                ->performedOn($user)
                ->withProperties([
                    'user_id' => $userId,
                    'user_name' => $user->name,
                    'old_roles' => $oldRoles,
                    'new_role' => $request->input('role'),
                ])
                ->log('assigned role to user');
        }

        // Reload user with roles and permissions for response
        $user->refresh();
        
        return response()->json([
            'message' => 'Role assigned successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->toArray(),
                'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            ],
        ]);
    }

    // ==================== SYSTEM SETTINGS ====================

    /**
     * Get system settings
     */
    public function getSettings()
    {
        $settings = DB::table('system_settings')
            ->select('id', 'key', 'value', 'type', 'description', 'group', 'created_at', 'updated_at')
            ->orderBy('group')
            ->orderBy('key')
            ->get();

        return response()->json($settings);
    }

    /**
     * Update system settings
     */
    public function updateSettings(Request $request)
    {
        $settings = $request->input('settings', $request->all());

        // If settings is an array of objects with full structure
        if (is_array($settings) && isset($settings[0]) && is_array($settings[0]) && isset($settings[0]['key'])) {
            foreach ($settings as $setting) {
                $key = $setting['key'];
                $value = $setting['value'] ?? '';
                $type = $setting['type'] ?? 'string';
                $description = $setting['description'] ?? null;
                $group = $setting['group'] ?? 'general';

                DB::table('system_settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => $value,
                        'type' => $type,
                        'description' => $description,
                        'group' => $group,
                        'updated_at' => now(),
                        'created_at' => DB::raw('COALESCE(created_at, NOW())'),
                    ]
                );
            }
        } else {
            // Legacy: simple key-value pairs
            foreach ($settings as $key => $value) {
                $existing = DB::table('system_settings')->where('key', $key)->first();
                
                if ($existing) {
                    // Update existing setting, preserve type, description, group
                    DB::table('system_settings')
                        ->where('key', $key)
                        ->update([
                            'value' => $value,
                            'updated_at' => now()
                        ]);
                } else {
                    // Create new setting with default values
                    DB::table('system_settings')->insert([
                        'key' => $key,
                        'value' => $value,
                        'type' => 'string',
                        'description' => null,
                        'group' => 'general',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
        }

        // Log activity
        if (auth()->check()) {
            activity('system')
                ->causedBy(auth()->user())
                ->withProperties([
                    'settings_count' => is_array($settings) ? count($settings) : 0,
                    'settings_keys' => is_array($settings) ? array_keys($settings) : [],
                ])
                ->log('updated system settings');
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    // ==================== ACTIVITY LOGS ====================

    /**
     * Get system activity logs with filtering options
     */
    public function getActivityLogs(Request $request)
    {
        $query = DB::table('activity_log')
            ->select(
                'activity_log.id',
                'activity_log.log_name',
                'activity_log.description',
                'activity_log.subject_type',
                'activity_log.subject_id',
                'activity_log.causer_type',
                'activity_log.causer_id',
                'activity_log.properties',
                'activity_log.created_at',
                'users.name as user_name',
                'users.email as user_email',
                'users.avatar as user_avatar'
            )
            ->leftJoin('users', function($join) {
                $join->on('activity_log.causer_id', '=', 'users.id')
                     ->where('activity_log.causer_type', '=', 'App\\Models\\User');
            });

        // Filter by log name (type of activity)
        if ($request->has('type') && $request->type) {
            $query->where('activity_log.log_name', $request->type);
        }

        // Filter by user
        if ($request->has('user_id') && $request->user_id) {
            $query->where('activity_log.causer_id', $request->user_id);
        }

        // Filter by event (if event column exists - try to extract from description or properties)
        // Note: event column may not exist in all activity_log tables
        if ($request->has('event') && $request->event) {
            // Try to match event in description or properties
            $eventSearch = $request->event;
            $query->where(function($q) use ($eventSearch) {
                $q->where('activity_log.description', 'LIKE', "%{$eventSearch}%");
            });
        }

        // Filter by subject type
        if ($request->has('subject_type') && $request->subject_type) {
            $query->where('activity_log.subject_type', $request->subject_type);
        }

        // Search in description
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('activity_log.description', 'LIKE', "%{$search}%")
                  ->orWhere('users.name', 'LIKE', "%{$search}%")
                  ->orWhere('users.email', 'LIKE', "%{$search}%");
            });
        }

        // Date range filter
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('activity_log.created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('activity_log.created_at', '<=', $request->date_to);
        }

        // Order by created_at desc
        $query->orderBy('activity_log.created_at', 'desc');

        // Pagination
        $perPage = $request->get('per_page', 50);
        $logs = $query->paginate($perPage);

        // Get available filter options for UI
        // Note: activity_log table doesn't have 'event' column in this database
        try {
            $filters = [
                'types' => DB::table('activity_log')
                    ->select('log_name as type')
                    ->whereNotNull('log_name')
                    ->distinct()
                    ->orderBy('log_name')
                    ->pluck('type')
                    ->toArray(),
                'events' => [], // Events not available - column doesn't exist in table
                'subject_types' => DB::table('activity_log')
                    ->select('subject_type')
                    ->whereNotNull('subject_type')
                    ->distinct()
                    ->orderBy('subject_type')
                    ->pluck('subject_type')
                    ->toArray(),
            ];
        } catch (\Exception $e) {
            \Log::error('Error getting filters: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            $filters = [
                'types' => [],
                'events' => [],
                'subject_types' => [],
            ];
        }

        try {
            return response()->json([
                'data' => $logs->items(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'filters' => $filters,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getActivityLogs response: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Greška pri učitavanju logova aktivnosti',
                'message' => $e->getMessage(),
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 50,
                'total' => 0,
                'filters' => [
                    'types' => [],
                    'events' => [],
                    'subject_types' => [],
                ],
            ], 500);
        }
    }

    // ==================== SYSTEM STATISTICS ====================

    /**
     * Get system statistics for admin dashboard
     */
    public function getSystemStats()
    {
        // Check if user has admin or super-admin role
        $user = auth()->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }
        
        try {
            // 1. Broj korisnika
            $totalUsers = DB::table('users')->count();
            
            // 2. Aktivne sesije (tokeni aktivni u poslednjih 15 minuta)
            // Sanctum čuva last_used_at kolonu u personal_access_tokens tabeli
            $activeSessions = 0;
            try {
                $activeSessions = DB::table('personal_access_tokens')
                    ->where('last_used_at', '>=', now()->subMinutes(15))
                    ->distinct('tokenable_id')
                    ->count('tokenable_id');
            } catch (\Exception $e) {
                // Ako tabela ne postoji, vrati 0
            }
            
            // 3. Sistem uptime (vreme od kreiranja prve aktivnosti)
            $firstRecord = DB::table('users')
                ->orderBy('created_at', 'asc')
                ->first();
            
            $uptimeDays = $firstRecord 
                ? now()->diffInDays($firstRecord->created_at) 
                : 0;
            
            // 4. Veličina baze podataka
            $databaseName = config('database.connections.mysql.database');
            $sizeInMB = 0;
            try {
                $databaseSize = DB::select("
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                    FROM information_schema.TABLES
                    WHERE table_schema = ?
                ", [$databaseName]);
                
                $sizeInMB = $databaseSize[0]->size_mb ?? 0;
            } catch (\Exception $e) {
                // Ako ne može da dohvati, vrati 0
            }
            
            // Formatiranje veličine baze
            $formattedSize = $sizeInMB >= 1024 
                ? round($sizeInMB / 1024, 2) . ' GB' 
                : $sizeInMB . ' MB';
            
            // 5. Dodatne statistike
            $newUsersToday = DB::table('users')
                ->whereDate('created_at', today())
                ->count();
            
            $newUsersThisWeek = DB::table('users')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count();
            
            return response()->json([
                'total_users' => $totalUsers,
                'active_sessions' => $activeSessions,
                'uptime_days' => $uptimeDays,
                'uptime_formatted' => $uptimeDays . ' dana',
                'database_size_mb' => $sizeInMB,
                'database_size_formatted' => $formattedSize,
                'new_users_today' => $newUsersToday,
                'new_users_this_week' => $newUsersThisWeek,
                'server_time' => now()->toDateTimeString(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSystemStats', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'total_users' => 0,
                'active_sessions' => 0,
                'uptime_days' => 0,
                'uptime_formatted' => '0 dana',
                'database_size_mb' => 0,
                'database_size_formatted' => '0 MB',
                'new_users_today' => 0,
                'new_users_this_week' => 0,
                'server_time' => now()->toDateTimeString(),
            ], 200);
        }
    }
}

