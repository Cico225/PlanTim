<?php

namespace App\Http\Middleware;

use App\Support\ModulePermissionHelper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFinanceKreditiAccess
{
    private const MODULE = 'planika.finance.krediti';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $path = $request->path();
        $method = $request->method();

        $action = match (true) {
            str_contains($path, 'export-zabrane') => 'export',
            str_contains($path, '/upload') => 'import',
            str_contains($path, 'bulk-delete') => 'manage',
            str_contains($path, 'verify-zabrana'), str_contains($path, 'unpair-zabrana'), str_contains($path, 'bulk-verify'), str_contains($path, 'bulk-unpair') => 'manage',
            $method === 'DELETE' => 'manage',
            in_array($method, ['POST', 'PUT', 'PATCH'], true) => 'manage',
            default => 'view',
        };

        $allowed = $action === 'view'
            ? ModulePermissionHelper::hasModuleAccess($user, self::MODULE)
            : ModulePermissionHelper::allows($user, self::MODULE, $action);

        if (! $allowed && $action !== 'view') {
            $allowed = ModulePermissionHelper::allows($user, self::MODULE, 'manage');
        }

        if (! $allowed) {
            return response()->json(['message' => 'Nemate dozvolu za modul kredita.'], 403);
        }

        return $next($request);
    }
}
