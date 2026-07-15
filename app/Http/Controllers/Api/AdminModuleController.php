<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdminModuleController extends Controller
{
    /**
     * Get all system modules
     */
    public function getModules(Request $request)
    {
        $modules = DB::table('system_modules')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($module) {
                // Parse JSON fields
                $module->available_permissions = json_decode($module->available_permissions, true) ?? [];
                return $module;
            });

        return response()->json($modules);
    }

    /**
     * Get user's module permissions
     */
    public function getUserModulePermissions(Request $request, $userId)
    {
        $permissions = DB::table('user_module_permissions')
            ->select('user_module_permissions.*', 'system_modules.display_name', 'system_modules.icon', 'system_modules.is_plugin')
            ->join('system_modules', 'user_module_permissions.module_name', '=', 'system_modules.name')
            ->where('user_id', $userId)
            ->get();

        // Get all available modules for comparison
        $allModules = DB::table('system_modules')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Create permissions array with defaults for modules without explicit permissions
        $modulePermissions = [];
        foreach ($allModules as $module) {
            $userPermission = $permissions->firstWhere('module_name', $module->name);
            
            $modulePermissions[] = [
                'module_name' => $module->name,
                'display_name' => $module->display_name,
                'icon' => $module->icon,
                'is_plugin' => $module->is_plugin,
                'available_permissions' => json_decode($module->available_permissions, true),
                'can_view' => $userPermission ? $userPermission->can_view : false,
                'can_read' => $userPermission ? $userPermission->can_read : false,
                'can_create' => $userPermission ? $userPermission->can_create : false,
                'can_update' => $userPermission ? $userPermission->can_update : false,
                'can_delete' => $userPermission ? $userPermission->can_delete : false,
                'can_export' => $userPermission ? $userPermission->can_export : false,
                'can_import' => $userPermission ? $userPermission->can_import : false,
                'custom_permissions' => $userPermission ? json_decode($userPermission->custom_permissions, true) : null,
            ];
        }

        return response()->json($modulePermissions);
    }

    /**
     * Update user's module permissions
     */
    public function updateUserModulePermissions(Request $request, $userId)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*.module_name' => 'required|string|exists:system_modules,name',
            'permissions.*.can_view' => 'boolean',
            'permissions.*.can_read' => 'boolean',
            'permissions.*.can_create' => 'boolean',
            'permissions.*.can_update' => 'boolean',
            'permissions.*.can_delete' => 'boolean',
            'permissions.*.can_export' => 'boolean',
            'permissions.*.can_import' => 'boolean',
            'permissions.*.custom_permissions' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get user info for logging
        $user = DB::table('users')->find($userId);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        DB::beginTransaction();
        try {
            $updatedModules = [];
            foreach ($request->input('permissions') as $permission) {
                // Get old permissions for comparison
                $oldPermission = DB::table('user_module_permissions')
                    ->where('user_id', $userId)
                    ->where('module_name', $permission['module_name'])
                    ->first();
                
                DB::table('user_module_permissions')->updateOrInsert(
                    [
                        'user_id' => $userId,
                        'module_name' => $permission['module_name'],
                    ],
                    [
                        'can_view' => $permission['can_view'] ?? false,
                        'can_read' => $permission['can_read'] ?? false,
                        'can_create' => $permission['can_create'] ?? false,
                        'can_update' => $permission['can_update'] ?? false,
                        'can_delete' => $permission['can_delete'] ?? false,
                        'can_export' => $permission['can_export'] ?? false,
                        'can_import' => $permission['can_import'] ?? false,
                        'custom_permissions' => isset($permission['custom_permissions']) 
                            ? json_encode($permission['custom_permissions']) 
                            : null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
                
                $updatedModules[] = $permission['module_name'];
            }

            DB::commit();
            
            // Log activity
            if (auth()->check()) {
                activity('user')
                    ->causedBy(auth()->user())
                    ->withProperties([
                        'user_id' => $userId,
                        'user_name' => $user->name,
                        'user_email' => $user->email,
                        'updated_modules' => $updatedModules,
                        'modules_count' => count($updatedModules),
                    ])
                    ->log('updated user module permissions');
            }
            
            return response()->json(['message' => 'Permissions updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to update user module permissions', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Failed to update permissions'], 500);
        }
    }

    /**
     * Get user's accessible modules (for menu generation)
     * Only returns modules where user has can_view permission
     */
    public function getUserAccessibleModules(Request $request)
    {
        try {
            $userId = auth()->id();
            $user = auth()->user();
            
            // Check if user is admin using Spatie roles
            $isAdmin = $user->hasAnyRole(['admin', 'super_admin', 'Super Admin', 'Admin']);
            
            Log::info('getUserAccessibleModules called', [
                'user_id' => $userId,
                'is_admin' => $isAdmin,
                'roles' => $user->getRoleNames()->toArray()
            ]);

            // Admin users see all active modules
            if ($isAdmin) {
                $accessibleModules = DB::table('system_modules')
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->get();
                    
                return response()->json($accessibleModules);
            }

            // Get user's permissions for non-admin users
            $userPermissions = DB::table('user_module_permissions')
                ->where('user_id', $userId)
                ->where('can_view', true)
                ->pluck('module_name')
                ->toArray();
            
            // Non-admin users only see modules they have can_view permission for
            if (empty($userPermissions)) {
                // User has no permissions - return empty array
                return response()->json([]);
            }

            $accessibleModules = DB::table('system_modules')
                ->where('is_active', true)
                ->whereIn('name', $userPermissions)
                ->orderBy('sort_order')
                ->get();
            
            return response()->json($accessibleModules);
        } catch (\Throwable $e) {
            Log::error('getUserAccessibleModules failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            // Return empty array on error to prevent frontend crash
            return response()->json([], 200);
        }
    }

    /**
     * Create or update system module
     */
    public function updateModule(Request $request, $moduleId = null)
    {
        // If only is_active is being updated, use simpler validation
        if ($moduleId && $request->has('is_active') && count($request->all()) === 1) {
            $validator = Validator::make($request->all(), [
                'is_active' => 'required|boolean',
            ]);
        } else {
            // Full validation for create or full update
            $validator = Validator::make($request->all(), [
                'name' => $moduleId ? 'sometimes|required|string|max:255|unique:system_modules,name,' . $moduleId : 'required|string|max:255|unique:system_modules,name',
                'display_name' => $moduleId ? 'sometimes|required|string|max:255' : 'required|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:255',
                'route' => 'nullable|string|max:255',
                'available_permissions' => 'nullable|array',
                'is_active' => 'nullable|boolean',
                'is_plugin' => 'nullable|boolean',
                'sort_order' => 'nullable|integer|min:0',
            ]);
        }

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($moduleId) {
            // Get module before update for logging
            $oldModule = DB::table('system_modules')->find($moduleId);
            
            if (!$oldModule) {
                return response()->json(['message' => 'Module not found'], 404);
            }
            
            // For PUT with only is_active, handle separately
            if ($request->has('is_active') && count($request->all()) === 1) {
                DB::table('system_modules')->where('id', $moduleId)->update([
                    'is_active' => $request->input('is_active'),
                    'updated_at' => now()
                ]);
            } else {
                // Build update data only with provided fields
                $updateData = ['updated_at' => now()];
                
                if ($request->has('name')) {
                    $updateData['name'] = $request->input('name');
                }
                if ($request->has('display_name')) {
                    $updateData['display_name'] = $request->input('display_name');
                }
                if ($request->has('description')) {
                    $updateData['description'] = $request->input('description');
                }
                if ($request->has('icon')) {
                    $updateData['icon'] = $request->input('icon');
                }
                if ($request->has('route')) {
                    $updateData['route'] = $request->input('route');
                }
                if ($request->has('available_permissions')) {
                    $updateData['available_permissions'] = json_encode($request->input('available_permissions', []));
                }
                if ($request->has('is_active')) {
                    $updateData['is_active'] = $request->input('is_active');
                }
                if ($request->has('is_plugin')) {
                    $updateData['is_plugin'] = $request->input('is_plugin');
                }
                if ($request->has('sort_order')) {
                    $updateData['sort_order'] = $request->input('sort_order');
                }
                
                DB::table('system_modules')->where('id', $moduleId)->update($updateData);
            }
            
            $module = DB::table('system_modules')->find($moduleId);
            
            // Log activity for module status change
            if (auth()->check() && $oldModule && $request->has('is_active') && $oldModule->is_active != $request->input('is_active')) {
                activity('system')
                    ->causedBy(auth()->user())
                    ->withProperties([
                        'module_id' => $moduleId,
                        'module_name' => $module->name ?? $oldModule->name,
                        'module_display_name' => $module->display_name ?? $oldModule->display_name,
                        'old_status' => $oldModule->is_active ? 'active' : 'inactive',
                        'new_status' => $request->input('is_active') ? 'active' : 'inactive',
                    ])
                    ->log($request->input('is_active') ? 'activated module' : 'deactivated module');
            }
        } else {
            // Create new module
            $data = [
                'name' => $request->input('name'),
                'display_name' => $request->input('display_name'),
                'description' => $request->input('description'),
                'icon' => $request->input('icon'),
                'route' => $request->input('route'),
                'available_permissions' => json_encode($request->input('available_permissions', [])),
                'is_active' => $request->input('is_active', true),
                'is_plugin' => $request->input('is_plugin', false),
                'sort_order' => $request->input('sort_order', 0),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            $moduleId = DB::table('system_modules')->insertGetId($data);
            $module = DB::table('system_modules')->find($moduleId);
            
            // Log activity for module creation
            if (auth()->check()) {
                activity('system')
                    ->causedBy(auth()->user())
                    ->withProperties([
                        'module_id' => $moduleId,
                        'module_name' => $data['name'],
                        'module_display_name' => $data['display_name'],
                        'is_plugin' => $data['is_plugin'] ?? false,
                    ])
                    ->log('created module');
            }
        }

        // Parse JSON fields for response
        $module->available_permissions = json_decode($module->available_permissions, true) ?? [];
        return response()->json($module);
    }

    /**
     * Delete system module
     */
    public function deleteModule($moduleId)
    {
        $module = DB::table('system_modules')->find($moduleId);
        
        if (!$module) {
            return response()->json(['message' => 'Module not found'], 404);
        }

        // Check if module is in use
        $userPermissionsCount = DB::table('user_module_permissions')
            ->where('module_name', $module->name)
            ->count();

        $rolePermissionsCount = DB::table('role_module_permissions')
            ->where('module_name', $module->name)
            ->count();

        if ($userPermissionsCount > 0 || $rolePermissionsCount > 0) {
            return response()->json([
                'message' => "Cannot delete module. It has {$userPermissionsCount} user permission(s) and {$rolePermissionsCount} role-based permission(s) assigned."
            ], 422);
        }

        DB::table('system_modules')->where('id', $moduleId)->delete();

        return response()->json(['message' => 'Module deleted successfully']);
    }

    /**
     * Get plugin settings
     */
    public function getPluginSettings(Request $request, $pluginName)
    {
        $settings = DB::table('plugin_settings')
            ->where('plugin_name', $pluginName)
            ->get();

        return response()->json($settings);
    }

    /**
     * Update plugin settings
     */
    public function updatePluginSettings(Request $request, $pluginName)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.setting_key' => 'required|string',
            'settings.*.setting_value' => 'nullable',
            'settings.*.setting_type' => 'required|in:string,boolean,integer,json',
            'settings.*.description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($request->input('settings') as $setting) {
                DB::table('plugin_settings')->updateOrInsert(
                    [
                        'plugin_name' => $pluginName,
                        'setting_key' => $setting['setting_key'],
                    ],
                    [
                        'setting_value' => $setting['setting_value'],
                        'setting_type' => $setting['setting_type'],
                        'description' => $setting['description'] ?? null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            DB::commit();
            return response()->json(['message' => 'Plugin settings updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Failed to update plugin settings'], 500);
        }
    }

    /**
     * Copy permissions from one user to another
     */
    public function copyUserPermissions(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'source_user_id' => 'required|integer|exists:users,id',
            'target_user_ids' => 'required|array',
            'target_user_ids.*' => 'integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sourceUserId = $request->input('source_user_id');
        $targetUserIds = $request->input('target_user_ids');

        // Get source user permissions
        $sourcePermissions = DB::table('user_module_permissions')
            ->where('user_id', $sourceUserId)
            ->get();

        if ($sourcePermissions->isEmpty()) {
            return response()->json(['message' => 'Source user has no permissions to copy'], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($targetUserIds as $targetUserId) {
                // Delete existing permissions for target user
                DB::table('user_module_permissions')
                    ->where('user_id', $targetUserId)
                    ->delete();

                // Copy permissions from source user
                foreach ($sourcePermissions as $permission) {
                    DB::table('user_module_permissions')->insert([
                        'user_id' => $targetUserId,
                        'module_name' => $permission->module_name,
                        'can_view' => $permission->can_view,
                        'can_read' => $permission->can_read,
                        'can_create' => $permission->can_create,
                        'can_update' => $permission->can_update,
                        'can_delete' => $permission->can_delete,
                        'can_export' => $permission->can_export,
                        'can_import' => $permission->can_import,
                        'custom_permissions' => $permission->custom_permissions,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Permissions copied successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Failed to copy permissions'], 500);
        }
    }

    /**
     * Get all roles (for role management)
     */
    public function getRoles(Request $request)
    {
        try {
            // Build select columns dynamically based on what exists
            $selectColumns = ['id', 'name', 'guard_name', 'created_at', 'updated_at'];
            
            if (Schema::hasColumn('roles', 'display_name')) {
                $selectColumns[] = 'display_name';
            }
            if (Schema::hasColumn('roles', 'description')) {
                $selectColumns[] = 'description';
            }
            if (Schema::hasColumn('roles', 'is_system')) {
                $selectColumns[] = 'is_system';
            }
            
            $roles = DB::table('roles')
                ->select($selectColumns)
                ->orderBy('name')
                ->get()
                ->map(function ($role) {
                    // If display_name doesn't exist, create it from name
                    if (!isset($role->display_name) || empty($role->display_name)) {
                        $role->display_name = ucfirst(str_replace(['-', '_'], ' ', $role->name));
                    }
                    // Set is_system to false if null or doesn't exist
                    if (!isset($role->is_system)) {
                        $role->is_system = false;
                    }
                    // Set description to null if doesn't exist
                    if (!isset($role->description)) {
                        $role->description = null;
                    }
                    return $role;
                });

            return response()->json($roles);
        } catch (\Exception $e) {
            Log::error('Failed to get roles', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Failed to load roles'], 500);
        }
    }

    /**
     * Get role's module permissions
     */
    public function getRoleModulePermissions(Request $request, $roleId)
    {
        $roleModulePerms = DB::table('role_module_permissions')
            ->select('role_module_permissions.*', 'system_modules.display_name', 'system_modules.icon', 'system_modules.is_plugin')
            ->join('system_modules', 'role_module_permissions.module_name', '=', 'system_modules.name')
            ->where('role_id', $roleId)
            ->get();

        // Get all available modules for comparison
        $allModules = DB::table('system_modules')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Create permissions array with defaults for modules without explicit permissions
        $modulePermissions = [];
        foreach ($allModules as $module) {
            $roleModulePerm = $roleModulePerms->firstWhere('module_name', $module->name);
            
            $modulePermissions[] = [
                'module_name' => $module->name,
                'display_name' => $module->display_name,
                'icon' => $module->icon,
                'is_plugin' => $module->is_plugin,
                'available_permissions' => json_decode($module->available_permissions, true),
                'can_view' => $roleModulePerm ? $roleModulePerm->can_view : false,
                'can_read' => $roleModulePerm ? $roleModulePerm->can_read : false,
                'can_create' => $roleModulePerm ? $roleModulePerm->can_create : false,
                'can_update' => $roleModulePerm ? $roleModulePerm->can_update : false,
                'can_delete' => $roleModulePerm ? $roleModulePerm->can_delete : false,
                'can_export' => $roleModulePerm ? $roleModulePerm->can_export : false,
                'can_import' => $roleModulePerm ? $roleModulePerm->can_import : false,
                'custom_permissions' => $roleModulePerm ? json_decode($roleModulePerm->custom_permissions, true) : null,
            ];
        }

        return response()->json($modulePermissions);
    }

    /**
     * Update role's module permissions
     */
    public function updateRoleModulePermissions(Request $request, $roleId)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*.module_name' => 'required|string|exists:system_modules,name',
            'permissions.*.can_view' => 'boolean',
            'permissions.*.can_read' => 'boolean',
            'permissions.*.can_create' => 'boolean',
            'permissions.*.can_update' => 'boolean',
            'permissions.*.can_delete' => 'boolean',
            'permissions.*.can_export' => 'boolean',
            'permissions.*.can_import' => 'boolean',
            'permissions.*.custom_permissions' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get role info for logging
        $role = DB::table('roles')->find($roleId);
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        DB::beginTransaction();
        try {
            $updatedModules = [];
            foreach ($request->input('permissions') as $permissionData) {
                DB::table('role_module_permissions')->updateOrInsert(
                    [
                        'role_id' => $roleId,
                        'module_name' => $permissionData['module_name'],
                    ],
                    [
                        'can_view' => $permissionData['can_view'] ?? false,
                        'can_read' => $permissionData['can_read'] ?? false,
                        'can_create' => $permissionData['can_create'] ?? false,
                        'can_update' => $permissionData['can_update'] ?? false,
                        'can_delete' => $permissionData['can_delete'] ?? false,
                        'can_export' => $permissionData['can_export'] ?? false,
                        'can_import' => $permissionData['can_import'] ?? false,
                        'custom_permissions' => isset($permissionData['custom_permissions']) 
                            ? json_encode($permissionData['custom_permissions']) 
                            : null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
                
                $updatedModules[] = $permissionData['module_name'];
            }

            DB::commit();
            
            // Log activity
            if (auth()->check()) {
                activity('system')
                    ->causedBy(auth()->user())
                    ->withProperties([
                        'role_id' => $roleId,
                        'role_name' => $role->name,
                        'updated_modules' => $updatedModules,
                        'modules_count' => count($updatedModules),
                    ])
                    ->log('updated role module permissions');
            }
            
            return response()->json(['message' => 'Role module permissions updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to update role module permissions', [
                'role_id' => $roleId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Failed to update permissions'], 500);
        }
    }
}