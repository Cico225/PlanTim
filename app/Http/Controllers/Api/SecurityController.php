<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class SecurityController extends Controller
{
    /**
     * Get security settings (admin only for full settings)
     */
    public function getSecuritySettings()
    {
        $settings = DB::table('system_settings')
            ->where('group', 'security')
            ->orderBy('key')
            ->get()
            ->mapWithKeys(function ($setting) {
                // Convert value based on type
                $value = $setting->value;
                if ($setting->type === 'boolean') {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                } elseif ($setting->type === 'integer') {
                    $value = (int) $value;
                }
                return [$setting->key => [
                    'value' => $value,
                    'type' => $setting->type,
                    'description' => $setting->description,
                ]];
            });

        return response()->json($settings);
    }

    /**
     * Get public security settings (available to all authenticated users)
     * Returns only settings that are safe to expose to all users (like auto_logout_timeout and session_lifetime)
     */
    public function getPublicSecuritySettings()
    {
        $settings = DB::table('system_settings')
            ->where('group', 'security')
            ->whereIn('key', ['auto_logout_timeout', 'session_lifetime'])
            ->orderBy('key')
            ->get()
            ->mapWithKeys(function ($setting) {
                // Convert value based on type
                $value = $setting->value;
                if ($setting->type === 'boolean') {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                } elseif ($setting->type === 'integer') {
                    $value = (int) $value;
                }
                return [$setting->key => [
                    'value' => $value,
                    'type' => $setting->type,
                ]];
            });

        return response()->json($settings);
    }

    /**
     * Update security settings
     */
    public function updateSecuritySettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password_min_length' => 'nullable|integer|min:6|max:32',
            'password_require_uppercase' => 'nullable|boolean',
            'password_require_lowercase' => 'nullable|boolean',
            'password_require_numbers' => 'nullable|boolean',
            'password_require_symbols' => 'nullable|boolean',
            'password_expiration_days' => 'nullable|integer|min:0|max:365',
            'session_lifetime' => 'nullable|integer|min:5|max:1440',
            'auto_logout_timeout' => 'nullable|integer|min:0|max:1440',
            'max_login_attempts' => 'nullable|integer|min:1|max:10',
            'lockout_duration' => 'nullable|integer|min:1|max:1440',
            'require_2fa' => 'nullable|boolean',
            'ip_whitelist_enabled' => 'nullable|boolean',
            'ip_whitelist' => 'nullable|string',
            'audit_log_enabled' => 'nullable|boolean',
            'audit_log_retention_days' => 'nullable|integer|min:1|max:3650',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $settings = $request->all();

        foreach ($settings as $key => $value) {
            if (in_array($key, [
                'password_min_length',
                'password_require_uppercase',
                'password_require_lowercase',
                'password_require_numbers',
                'password_require_symbols',
                'password_expiration_days',
                'session_lifetime',
                'auto_logout_timeout',
                'max_login_attempts',
                'lockout_duration',
                'require_2fa',
                'ip_whitelist_enabled',
                'ip_whitelist',
                'audit_log_enabled',
                'audit_log_retention_days',
            ])) {
                $type = 'string';
                if (is_bool($value)) {
                    $type = 'boolean';
                    $value = $value ? 'true' : 'false';
                } elseif (is_int($value)) {
                    $type = 'integer';
                }

                DB::table('system_settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => (string) $value,
                        'type' => $type,
                        'group' => 'security',
                        'description' => $this->getSettingDescription($key),
                        'updated_at' => now(),
                        'created_at' => DB::raw('COALESCE(created_at, NOW())'),
                    ]
                );
            }
        }

        // Log activity
        activity()
            ->causedBy(auth()->user())
            ->log('Security settings updated');

        return response()->json([
            'message' => 'Security settings updated successfully',
        ]);
    }

    /**
     * Get failed login attempts
     * Note: This table may not exist yet - will return empty array if table doesn't exist
     */
    public function getFailedLoginAttempts(Request $request)
    {
        try {
            // Check if table exists
            if (!Schema::hasTable('failed_login_attempts')) {
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 50,
                    'total' => 0,
                ]);
            }

            $query = DB::table('failed_login_attempts')
                ->select(
                    'failed_login_attempts.*',
                    'users.name as user_name',
                    'users.email as user_email'
                )
                ->leftJoin('users', 'failed_login_attempts.email', '=', 'users.email')
                ->orderBy('failed_login_attempts.created_at', 'desc');

            // Filters
            if ($request->has('email')) {
                $query->where('failed_login_attempts.email', 'like', '%' . $request->input('email') . '%');
            }

            if ($request->has('ip_address')) {
                $query->where('failed_login_attempts.ip_address', $request->input('ip_address'));
            }

            if ($request->has('blocked')) {
                $query->where('failed_login_attempts.blocked', $request->input('blocked'));
            }

            $attempts = $query->paginate(50);

            return response()->json($attempts);
        } catch (\Exception $e) {
            Log::warning('Failed login attempts table not found: ' . $e->getMessage());
            return response()->json([
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 50,
                'total' => 0,
            ]);
        }
    }

    /**
     * Unblock IP address or email
     */
    public function unblock(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:ip,email',
            'value' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if table exists
        if (!Schema::hasTable('failed_login_attempts')) {
            return response()->json([
                'message' => 'Failed login attempts table not found',
            ], 404);
        }

        $type = $request->input('type');
        $value = $request->input('value');

        if ($type === 'ip') {
            DB::table('failed_login_attempts')
                ->where('ip_address', $value)
                ->update(['blocked' => false, 'blocked_until' => null]);
        } else {
            DB::table('failed_login_attempts')
                ->where('email', $value)
                ->update(['blocked' => false, 'blocked_until' => null]);
        }

        // Log activity
        try {
            activity()
                ->causedBy(auth()->user())
                ->log('Unblocked ' . $type . ': ' . $value);
        } catch (\Exception $e) {
            Log::warning('Activity log failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => ucfirst($type) . ' unblocked successfully',
        ]);
    }

    /**
     * Get active sessions
     */
    public function getActiveSessions(Request $request)
    {
        $query = DB::table('personal_access_tokens')
            ->select(
                'personal_access_tokens.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->leftJoin('users', 'personal_access_tokens.tokenable_id', '=', 'users.id')
            ->where('personal_access_tokens.tokenable_type', 'App\\Models\\User')
            ->orderBy('personal_access_tokens.last_used_at', 'desc');

        // Filters
        if ($request->has('user_id')) {
            $query->where('personal_access_tokens.tokenable_id', $request->input('user_id'));
        }

        $sessions = $query->paginate(50);

        return response()->json($sessions);
    }

    /**
     * Revoke session/token
     */
    public function revokeSession($tokenId)
    {
        $token = DB::table('personal_access_tokens')->find($tokenId);

        if (!$token) {
            return response()->json(['message' => 'Token not found'], 404);
        }

        DB::table('personal_access_tokens')
            ->where('id', $tokenId)
            ->delete();

        // Log activity
        activity()
            ->causedBy(auth()->user())
            ->log('Session revoked: ' . $tokenId);

        return response()->json([
            'message' => 'Session revoked successfully',
        ]);
    }

    /**
     * Get security statistics
     */
    public function getSecurityStats()
    {
        $stats = [
            'failed_login_attempts_24h' => 0,
            'blocked_ips' => 0,
            'blocked_emails' => 0,
            'active_sessions' => 0,
            'total_sessions' => 0,
        ];

        // Check if failed_login_attempts table exists
        if (Schema::hasTable('failed_login_attempts')) {
            $stats['failed_login_attempts_24h'] = DB::table('failed_login_attempts')
                ->where('created_at', '>=', now()->subDay())
                ->count();
            $stats['blocked_ips'] = DB::table('failed_login_attempts')
                ->where('blocked', true)
                ->distinct('ip_address')
                ->count('ip_address');
            $stats['blocked_emails'] = DB::table('failed_login_attempts')
                ->where('blocked', true)
                ->distinct('email')
                ->count('email');
        }

        // Get session stats
        try {
            $stats['active_sessions'] = DB::table('personal_access_tokens')
                ->where('tokenable_type', 'App\\Models\\User')
                ->where('last_used_at', '>=', now()->subMinutes(15))
                ->count();
            $stats['total_sessions'] = DB::table('personal_access_tokens')
                ->where('tokenable_type', 'App\\Models\\User')
                ->count();
        } catch (\Exception $e) {
            Log::warning('Error getting session stats: ' . $e->getMessage());
        }

        return response()->json($stats);
    }

    /**
     * Get setting description
     */
    private function getSettingDescription($key)
    {
        $descriptions = [
            'password_min_length' => 'Minimalna dužina lozinke',
            'password_require_uppercase' => 'Zahtevaj velika slova',
            'password_require_lowercase' => 'Zahtevaj mala slova',
            'password_require_numbers' => 'Zahtevaj brojeve',
            'password_require_symbols' => 'Zahtevaj simbole',
            'password_expiration_days' => 'Period isteka lozinke (dani)',
            'session_lifetime' => 'Trajanje sesije (minuti)',
            'auto_logout_timeout' => 'Automatski logout nakon neaktivnosti (minuti, 0=isključeno)',
            'max_login_attempts' => 'Maksimalan broj pokušaja prijave',
            'lockout_duration' => 'Trajanje blokade (minuti)',
            'require_2fa' => 'Zahtevaj dvofaktorsku autentifikaciju',
            'ip_whitelist_enabled' => 'Omogući IP whitelist',
            'ip_whitelist' => 'Lista dozvoljenih IP adresa',
            'audit_log_enabled' => 'Omogući audit log',
            'audit_log_retention_days' => 'Period čuvanja audit loga (dani)',
        ];

        return $descriptions[$key] ?? $key;
    }
}

