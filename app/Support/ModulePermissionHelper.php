<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ModulePermissionHelper
{
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

        return in_array($role, ['admin', 'super-admin'], true);
    }

    public static function getPermission(int $userId, string $moduleName): ?object
    {
        if (!Schema::hasTable('user_module_permissions')) {
            return null;
        }

        return DB::table('user_module_permissions')
            ->where('user_id', $userId)
            ->where('module_name', $moduleName)
            ->first();
    }

    public static function hasModuleAccess($user, string $moduleName): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        $permission = self::getPermission((int) $user->id, $moduleName);

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

        $permission = self::getPermission((int) $user->id, $moduleName);
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
