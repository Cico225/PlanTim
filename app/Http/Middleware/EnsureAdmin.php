<?php

namespace App\Http\Middleware;

use App\Support\ModulePermissionHelper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized. Please log in.'], 401);
        }

        if (! ModulePermissionHelper::isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        return $next($request);
    }
}
