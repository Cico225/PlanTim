<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Interni scheduler — pokreće Laravel schedule:run najviše jednom u ~55 sekundi
 * dok je aplikacija u upotrebi. Nije potreban ručni Windows Task Scheduler.
 */
class RunInternalScheduler
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Cache::add('plantim_internal_scheduler_tick', now()->timestamp, 55)) {
            try {
                Artisan::call('schedule:run');
            } catch (\Throwable $e) {
                Log::warning('PlanTim internal scheduler tick failed: '.$e->getMessage());
            }
        }

        return $next($request);
    }
}
