<?php

namespace App\Http\Middleware;

use App\Support\ModulePermissionHelper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleAccess
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $isReadOnly = in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);

        if ($isReadOnly) {
            if (! ModulePermissionHelper::hasModuleAccess($user, $module)) {
                return response()->json(['message' => 'Nemate dozvolu za pregled ovog modula.'], 403);
            }
        } elseif (! ModulePermissionHelper::allows($user, $module, 'manage')) {
            return response()->json(['message' => 'Nemate dozvolu za izmjene u ovom modulu.'], 403);
        }

        return $next($request);
    }
}
