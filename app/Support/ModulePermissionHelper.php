<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ModulePermissionHelper
{
    /** Spatie permission module prefixes that map to a different system_modules.name */
    private const MODULE_ALIASES = [
        'administration' => 'admin',
        'chat' => 'inbox',
    ];

    /** @var array<int, list<string>> */
    private static array $spatieNamesCache = [];

    /** @var array<int, list<int>> */
    private static array $roleIdsCache = [];

    /** @var list<string>|null */
    private static ?array $moduleNamesCache = null;

    public static function isAdmin($user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(['admin', 'super-admin', 'super_admin', 'Super Admin', 'Admin'])) {
                    return true;
                }
            } catch (\Throwable) {
                // fall through
            }
        }

        $role = isset($user->role) ? strtolower((string) $user->role) : null;

        return in_array($role, ['admin', 'super-admin', 'super_admin'], true);
    }

    /**
     * Effective module permission for a user: direct user rows OR role_module_permissions
     * OR Spatie role permissions (from "Uloge i dozvole"), merged with OR semantics.
     */
    public static function getPermission(int $userId, string $moduleName, $user = null): ?object
    {
        $merged = self::emptyPermission($moduleName);
        $hasAny = false;

        $direct = self::getDirectUserPermission($userId, $moduleName);
        if ($direct) {
            $merged = self::orMerge($merged, $direct);
            $hasAny = true;
        }

        foreach (self::getRoleModulePermissionsForUser($userId, $moduleName) as $rolePerm) {
            $merged = self::orMerge($merged, $rolePerm);
            $hasAny = true;
        }

        $fromSpatie = self::permissionFromSpatie($userId, $moduleName, $user);
        if ($fromSpatie) {
            $merged = self::orMerge($merged, $fromSpatie);
            $hasAny = true;
        }

        return $hasAny ? $merged : null;
    }

    /**
     * Module names the user may see in the menu (can_view), including parent modules.
     *
     * @return list<string>
     */
    public static function getAccessibleModuleNames($user): array
    {
        if (!$user) {
            return [];
        }

        if (self::isAdmin($user)) {
            if (!Schema::hasTable('system_modules')) {
                return [];
            }

            return DB::table('system_modules')
                ->where('is_active', true)
                ->pluck('name')
                ->map(fn ($n) => (string) $n)
                ->all();
        }

        $userId = (int) $user->id;
        $moduleNames = self::knownModuleNames();
        $accessible = [];

        foreach ($moduleNames as $moduleName) {
            $permission = self::getPermission($userId, $moduleName, $user);
            if ($permission && !empty($permission->can_view)) {
                $accessible[$moduleName] = true;
            }
        }

        // Ensure parents of accessible children appear in the menu
        if (Schema::hasTable('system_modules') && !empty($accessible)) {
            $parentMap = DB::table('system_modules')
                ->whereNotNull('parent_name')
                ->pluck('parent_name', 'name')
                ->map(fn ($p) => $p !== null ? (string) $p : null)
                ->all();

            foreach (array_keys($accessible) as $name) {
                $current = $parentMap[$name] ?? null;
                while ($current) {
                    $accessible[$current] = true;
                    $current = $parentMap[$current] ?? null;
                }
            }
        }

        return array_keys($accessible);
    }

    public static function hasModuleAccess($user, string $moduleName): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        $permission = self::getPermission((int) $user->id, $moduleName, $user);

        return $permission ? (bool) $permission->can_view : false;
    }

    public static function allows(
        $user,
        string $moduleName,
        string $action,
        ?string $spatieFallback = null
    ): bool {
        if (self::isAdmin($user)) {
            return true;
        }

        $permission = self::getPermission((int) $user->id, $moduleName, $user);
        if ($permission) {
            return self::matchesAction($permission, $action);
        }

        if ($spatieFallback && method_exists($user, 'can')) {
            try {
                return $user->can($spatieFallback);
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }

    private static function getDirectUserPermission(int $userId, string $moduleName): ?object
    {
        if (!Schema::hasTable('user_module_permissions')) {
            return null;
        }

        return DB::table('user_module_permissions')
            ->where('user_id', $userId)
            ->where('module_name', $moduleName)
            ->first();
    }

    /**
     * @return list<object>
     */
    private static function getRoleModulePermissionsForUser(int $userId, string $moduleName): array
    {
        if (!Schema::hasTable('role_module_permissions') || !Schema::hasTable('model_has_roles')) {
            return [];
        }

        $roleIds = self::roleIdsForUser($userId);
        if ($roleIds === []) {
            return [];
        }

        return DB::table('role_module_permissions')
            ->whereIn('role_id', $roleIds)
            ->where('module_name', $moduleName)
            ->get()
            ->all();
    }

    /**
     * @return list<int>
     */
    private static function roleIdsForUser(int $userId): array
    {
        if (isset(self::$roleIdsCache[$userId])) {
            return self::$roleIdsCache[$userId];
        }

        if (!Schema::hasTable('model_has_roles')) {
            return self::$roleIdsCache[$userId] = [];
        }

        return self::$roleIdsCache[$userId] = DB::table('model_has_roles')
            ->where('model_id', $userId)
            ->where(function ($q) {
                $q->where('model_type', User::class)
                    ->orWhere('model_type', 'App\\Models\\User')
                    ->orWhere('model_type', 'user');
            })
            ->pluck('role_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private static function permissionFromSpatie(int $userId, string $moduleName, $user = null): ?object
    {
        $permissionNames = self::spatiePermissionNamesForUser($userId, $user);
        if ($permissionNames === []) {
            return null;
        }

        $canonical = self::canonicalModuleName($moduleName);
        $aliasesForTarget = array_keys(array_filter(
            self::MODULE_ALIASES,
            fn ($mapped) => $mapped === $canonical
        ));
        $targetPrefixes = array_unique(array_merge([$canonical, $moduleName], $aliasesForTarget));

        $merged = self::emptyPermission($moduleName);
        $matched = false;

        foreach ($permissionNames as $permName) {
            $resolved = self::resolveSpatiePermission($permName);
            if ($resolved === null) {
                continue;
            }

            if (!in_array($resolved['module'], $targetPrefixes, true)
                && self::canonicalModuleName($resolved['module']) !== $canonical) {
                continue;
            }

            $matched = true;
            $merged = self::applySpatieAction($merged, $resolved['action']);
        }

        return $matched ? $merged : null;
    }

    /**
     * @return list<string>
     */
    private static function spatiePermissionNamesForUser(int $userId, $user = null): array
    {
        if (isset(self::$spatieNamesCache[$userId])) {
            return self::$spatieNamesCache[$userId];
        }

        if ($user && method_exists($user, 'getAllPermissions')) {
            try {
                return self::$spatieNamesCache[$userId] = $user->getAllPermissions()
                    ->pluck('name')
                    ->map(fn ($n) => (string) $n)
                    ->all();
            } catch (\Throwable) {
                // fall through to DB
            }
        }

        if (!Schema::hasTable('permissions') || !Schema::hasTable('role_has_permissions')) {
            return self::$spatieNamesCache[$userId] = [];
        }

        $roleIds = self::roleIdsForUser($userId);
        $names = [];

        if ($roleIds !== []) {
            $names = array_merge($names, DB::table('role_has_permissions')
                ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                ->whereIn('role_has_permissions.role_id', $roleIds)
                ->pluck('permissions.name')
                ->all());
        }

        if (Schema::hasTable('model_has_permissions')) {
            $names = array_merge($names, DB::table('model_has_permissions')
                ->join('permissions', 'permissions.id', '=', 'model_has_permissions.permission_id')
                ->where('model_has_permissions.model_id', $userId)
                ->where(function ($q) {
                    $q->where('model_has_permissions.model_type', User::class)
                        ->orWhere('model_has_permissions.model_type', 'App\\Models\\User');
                })
                ->pluck('permissions.name')
                ->all());
        }

        return self::$spatieNamesCache[$userId] = array_values(array_unique(array_map('strval', $names)));
    }

    /**
     * @return array{module: string, action: string}|null
     */
    private static function resolveSpatiePermission(string $permissionName): ?array
    {
        $modules = self::knownModuleNames();
        // Longest prefix first so planika.maloprodaja beats planika
        usort($modules, fn ($a, $b) => strlen($b) <=> strlen($a));

        $aliases = self::MODULE_ALIASES;
        foreach ($aliases as $alias => $canonical) {
            if (!in_array($alias, $modules, true)) {
                $modules[] = $alias;
            }
        }
        usort($modules, fn ($a, $b) => strlen($b) <=> strlen($a));

        foreach ($modules as $module) {
            if ($permissionName === $module) {
                return [
                    'module' => self::canonicalModuleName($module),
                    'action' => 'view',
                ];
            }

            if (str_starts_with($permissionName, $module . '.')) {
                $action = substr($permissionName, strlen($module) + 1);

                return [
                    'module' => self::canonicalModuleName($module),
                    'action' => $action !== '' ? $action : 'view',
                ];
            }
        }

        // Fallback: module.action (first segment)
        $parts = explode('.', $permissionName);
        if (count($parts) >= 2) {
            return [
                'module' => self::canonicalModuleName($parts[0]),
                'action' => implode('.', array_slice($parts, 1)),
            ];
        }

        return null;
    }

    private static function applySpatieAction(object $permission, string $action): object
    {
        $action = strtolower($action);
        $custom = json_decode($permission->custom_permissions ?? '{}', true) ?: [];

        // Any Spatie grant implies the module is visible
        $permission->can_view = true;

        if (in_array($action, ['view', 'read', 'access'], true)) {
            $permission->can_read = true;
        } elseif ($action === 'create') {
            $permission->can_create = true;
            $permission->can_read = true;
        } elseif ($action === 'update') {
            $permission->can_update = true;
            $permission->can_read = true;
        } elseif ($action === 'delete') {
            $permission->can_delete = true;
            $permission->can_read = true;
        } elseif ($action === 'export') {
            $permission->can_export = true;
            $permission->can_read = true;
        } elseif ($action === 'import') {
            $permission->can_import = true;
            $permission->can_read = true;
        } elseif ($action === 'manage') {
            $permission->can_read = true;
            $permission->can_create = true;
            $permission->can_update = true;
            $permission->can_delete = true;
            $permission->can_export = true;
            $permission->can_import = true;
            $custom['manage'] = true;
        } else {
            // Nested / custom: planika.maloprodaja.controls.create → custom key
            $custom[$action] = true;
            $permission->can_read = true;

            if (str_contains($action, 'create') || str_contains($action, 'manage')) {
                $permission->can_create = true;
            }
            if (str_contains($action, 'update') || str_contains($action, 'manage') || str_contains($action, 'review')) {
                $permission->can_update = true;
            }
            if (str_contains($action, 'delete') || str_contains($action, 'manage')) {
                $permission->can_delete = true;
            }
            if (str_contains($action, 'export')) {
                $permission->can_export = true;
            }
            if (str_contains($action, 'import')) {
                $permission->can_import = true;
            }
        }

        $permission->custom_permissions = json_encode($custom);

        return $permission;
    }

    private static function canonicalModuleName(string $moduleName): string
    {
        return self::MODULE_ALIASES[$moduleName] ?? $moduleName;
    }

    /**
     * @return list<string>
     */
    private static function knownModuleNames(): array
    {
        if (self::$moduleNamesCache !== null) {
            return self::$moduleNamesCache;
        }

        if (!Schema::hasTable('system_modules')) {
            return self::$moduleNamesCache = [];
        }

        return self::$moduleNamesCache = DB::table('system_modules')
            ->pluck('name')
            ->map(fn ($n) => (string) $n)
            ->all();
    }

    private static function emptyPermission(string $moduleName): object
    {
        return (object) [
            'module_name' => $moduleName,
            'can_view' => false,
            'can_read' => false,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
            'can_export' => false,
            'can_import' => false,
            'custom_permissions' => '{}',
        ];
    }

    private static function orMerge(object $base, object $other): object
    {
        $base->can_view = (bool) $base->can_view || (bool) ($other->can_view ?? false);
        $base->can_read = (bool) $base->can_read || (bool) ($other->can_read ?? false);
        $base->can_create = (bool) $base->can_create || (bool) ($other->can_create ?? false);
        $base->can_update = (bool) $base->can_update || (bool) ($other->can_update ?? false);
        $base->can_delete = (bool) $base->can_delete || (bool) ($other->can_delete ?? false);
        $base->can_export = (bool) $base->can_export || (bool) ($other->can_export ?? false);
        $base->can_import = (bool) $base->can_import || (bool) ($other->can_import ?? false);

        $baseCustom = json_decode($base->custom_permissions ?? '{}', true) ?: [];
        $otherCustom = is_string($other->custom_permissions ?? null)
            ? (json_decode($other->custom_permissions, true) ?: [])
            : ((array) ($other->custom_permissions ?? []));

        foreach ($otherCustom as $key => $value) {
            if ($value) {
                $baseCustom[$key] = true;
            }
        }

        $base->custom_permissions = json_encode($baseCustom);

        return $base;
    }

    private static function matchesAction(object $permission, string $action): bool
    {
        if (!$permission->can_view && !in_array($action, ['view', 'access'], true)) {
            return false;
        }

        $custom = json_decode($permission->custom_permissions ?? '{}', true) ?: [];

        return match ($action) {
            'view', 'access' => (bool) $permission->can_view,
            'read' => (bool) ($permission->can_read || $permission->can_view),
            'create' => (bool) ($permission->can_create || !empty($custom['create'])),
            'update' => (bool) ($permission->can_update || !empty($custom['manage'])),
            'delete' => (bool) ($permission->can_delete || !empty($custom['manage'])),
            'export' => (bool) ($permission->can_export || !empty($custom['export'])),
            'import' => (bool) ($permission->can_import || !empty($custom['import'])),
            'manage' => (bool) (
                $permission->can_create
                || $permission->can_update
                || $permission->can_delete
                || $permission->can_import
                || !empty($custom['manage'])
            ),
            'review' => (bool) ($permission->can_update || !empty($custom['review'])),
            'view_own' => (bool) ($permission->can_read || !empty($custom['view_own']) || $permission->can_create),
            'view_all' => (bool) ($permission->can_read || !empty($custom['view_all'])),
            default => !empty($custom[$action]),
        };
    }
}
