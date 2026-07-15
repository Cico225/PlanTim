<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Schema\Blueprint;

class AuthController extends Controller
{
    /**
     * Register new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'is_active' => true,
        ]);

        // Assign default role (if exists)
        if (class_exists(\Spatie\Permission\Models\Role::class)) {
            $defaultRole = \Spatie\Permission\Models\Role::where('name', 'user')->first();
            if ($defaultRole) {
                $user->assignRole($defaultRole);
            }
        }

        // Create token
        $deviceName = $request->input('device_name', 'web-browser');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first() ?? 'user',
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
        ], 201);
    }

    /**
     * Login and get API token
     */
    public function login(Request $request)
    {
        try {
            return $this->performLogin($request);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Log::error('Login 500 error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            if (config('app.debug')) {
                return response()->json([
                    'message' => 'Greška pri prijavi: ' . $e->getMessage(),
                    'debug' => [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ],
                ], 500);
            }
            throw $e;
        }
    }

    /**
     * Perform the actual login logic
     */
    protected function performLogin(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'recaptcha_token' => ['nullable', 'string'],
        ]);

        // Validate reCAPTCHA if secret key is configured
        $recaptchaSecret = env('RECAPTCHA_SECRET_KEY');
        if ($recaptchaSecret && $request->has('recaptcha_token')) {
            $recaptchaToken = $request->input('recaptcha_token');
            
            if (empty($recaptchaToken)) {
                throw ValidationException::withMessages([
                    'recaptcha' => ['Molimo potvrdite da niste robot.'],
                ]);
            }

            // Verify reCAPTCHA token with Google
            $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
            $response = Http::asForm()->post($verifyUrl, [
                'secret' => $recaptchaSecret,
                'response' => $recaptchaToken,
                'remoteip' => $request->ip(),
            ]);

            $result = $response->json();

            if (!isset($result['success']) || !$result['success']) {
                throw ValidationException::withMessages([
                    'recaptcha' => ['reCAPTCHA validacija nije uspjela. Molimo pokušajte ponovo.'],
                ]);
            }
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        $this->ensureLoginVerificationTableExists();
        $this->sendLoginVerificationCode($user);

        return response()->json([
            'requires_verification' => true,
            'verification_token' => $this->getPendingVerificationToken($user),
            'masked_email' => $this->maskEmail($user->email),
            'expires_in' => 600,
            'message' => 'Kod za prijavu je poslan na vašu email adresu.',
        ]);
    }

    /**
     * Verify login code and complete authentication
     */
    public function verifyLogin(Request $request)
    {
        $request->validate([
            'verification_token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $this->ensureLoginVerificationTableExists();

        $verification = DB::table('login_verification_codes')
            ->where('token', $request->verification_token)
            ->first();

        if (!$verification) {
            throw ValidationException::withMessages([
                'code' => ['Sesija za prijavu je istekla. Molimo pokušajte ponovo.'],
            ]);
        }

        if (now()->greaterThan($verification->expires_at)) {
            DB::table('login_verification_codes')->where('id', $verification->id)->delete();
            throw ValidationException::withMessages([
                'code' => ['Kod je istekao. Molimo pokušajte ponovo.'],
            ]);
        }

        if (!Hash::check($request->code, $verification->code)) {
            throw ValidationException::withMessages([
                'code' => ['Uneseni kod nije ispravan.'],
            ]);
        }

        $user = User::find($verification->user_id);
        if (!$user || !$user->is_active) {
            DB::table('login_verification_codes')->where('id', $verification->id)->delete();
            throw ValidationException::withMessages([
                'code' => ['Korisnički nalog nije dostupan.'],
            ]);
        }

        DB::table('login_verification_codes')->where('user_id', $user->id)->delete();

        return response()->json($this->buildLoginResponse($user, $request));
    }

    /**
     * Resend login verification code
     */
    public function resendLoginCode(Request $request)
    {
        $request->validate([
            'verification_token' => ['required', 'string'],
        ]);

        $this->ensureLoginVerificationTableExists();

        $verification = DB::table('login_verification_codes')
            ->where('token', $request->verification_token)
            ->first();

        if (!$verification) {
            throw ValidationException::withMessages([
                'verification_token' => ['Sesija za prijavu je istekla. Molimo pokušajte ponovo.'],
            ]);
        }

        $user = User::find($verification->user_id);
        if (!$user || !$user->is_active) {
            DB::table('login_verification_codes')->where('id', $verification->id)->delete();
            throw ValidationException::withMessages([
                'verification_token' => ['Korisnički nalog nije dostupan.'],
            ]);
        }

        $this->sendLoginVerificationCode($user, $verification->token);

        return response()->json([
            'message' => 'Novi kod je poslan na vašu email adresu.',
            'masked_email' => $this->maskEmail($user->email),
            'expires_in' => 600,
        ]);
    }

    protected function ensureLoginVerificationTableExists(): void
    {
        if (Schema::hasTable('login_verification_codes')) {
            return;
        }

        Schema::create('login_verification_codes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('token', 64)->unique();
            $table->string('code');
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    protected function sendLoginVerificationCode(User $user, ?string $existingToken = null): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = $existingToken ?? Str::random(64);

        DB::table('login_verification_codes')->where('user_id', $user->id)->delete();

        DB::table('login_verification_codes')->insert([
            'user_id' => $user->id,
            'token' => $token,
            'code' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        try {
            Mail::send([], [], function ($message) use ($user, $code) {
                $message->to($user->email)
                    ->subject('Kod za prijavu - PlanTim')
                    ->from(config('mail.from.address'), config('mail.from.name', 'PlanTim'))
                    ->html(view('emails.login-verification-code', [
                        'user' => $user,
                        'code' => $code,
                    ])->render());
            });
        } catch (\Exception $e) {
            DB::table('login_verification_codes')->where('user_id', $user->id)->delete();

            \Log::error('Failed to send login verification email', [
                'error' => $e->getMessage(),
                'email' => $user->email,
            ]);

            throw ValidationException::withMessages([
                'email' => ['Slanje koda za prijavu nije uspjelo. Molimo pokušajte ponovo.'],
            ]);
        }
    }

    protected function getPendingVerificationToken(User $user): string
    {
        $verification = DB::table('login_verification_codes')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->first();

        return $verification?->token ?? '';
    }

    protected function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $visible = substr($local, 0, min(2, strlen($local)));
        $maskedLocal = $visible . str_repeat('*', max(strlen($local) - 2, 1));

        return $maskedLocal . '@' . $domain;
    }

    protected function buildLoginResponse(User $user, Request $request): array
    {
        $user->update(['last_login_at' => now()]);

        $deviceName = $request->input('device_name', 'web-browser');
        $token = $user->createToken($deviceName)->plainTextToken;

        $role = 'user';
        $permissions = [];
        try {
            $role = $user->getRoleNames()->first() ?? 'user';
            $permissions = $user->getAllPermissions()->pluck('name')->values()->all();
        } catch (\Throwable $e) {
            \Log::warning('Auth login: Failed to get roles/permissions', ['error' => $e->getMessage(), 'user_id' => $user->id]);
        }

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
                'permissions' => $permissions,
            ],
        ];
    }

    /**
     * Logout and revoke token
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'locale' => $user->locale,
            'theme' => $user->theme,
            'role' => $user->getRoleNames()->first() ?? 'user', // Add role for backward compatibility
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Ensure password_reset_tokens table exists
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        $user = User::where('email', $request->email)->first();

        // Always return success message for security (don't reveal if email exists)
        if (!$user) {
            return response()->json([
                'message' => 'Ako postoji korisnik sa ovom email adresom, poslat ćemo vam link za reset lozinke.',
            ], 200);
        }

        // Generate password reset token
        $token = Str::random(64);
        
        // Store token in password_reset_tokens table
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Generate reset URL
        // Use FRONTEND_URL if postoji u .env, inače APP_URL
        $frontendUrl = env('FRONTEND_URL', config('app.url'));
        $resetUrl = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        // Send email
        try {
            Mail::send([], [], function ($message) use ($user, $resetUrl) {
                $message->to($user->email)
                    ->subject('Reset lozinke - PlanTim')
                    ->from(config('mail.from.address'), config('mail.from.name', 'PlanTim'))
                    ->html(view('emails.reset-password', [
                        'user' => $user,
                        'resetUrl' => $resetUrl,
                    ])->render());
            });
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset email', [
                'error' => $e->getMessage(),
                'email' => $user->email,
            ]);
            
            // Still return success for security
            return response()->json([
                'message' => 'Ako postoji korisnik sa ovom email adresom, poslat ćemo vam link za reset lozinke.',
            ], 200);
        }

        return response()->json([
            'message' => 'Ako postoji korisnik sa ovom email adresom, poslat ćemo vam link za reset lozinke.',
        ], 200);
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // Ensure password_reset_tokens table exists
        if (!Schema::hasTable('password_reset_tokens')) {
            return response()->json([
                'message' => 'Tabela za reset lozinke nije pronađena. Molimo kontaktirajte administratora.',
            ], 500);
        }

        // Check if token exists and is valid
        $passwordReset = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$passwordReset) {
            return response()->json([
                'message' => 'Token za reset lozinke nije validan ili je istekao.',
            ], 422);
        }

        // Check if token is valid (created within last 60 minutes)
        if (now()->diffInMinutes($passwordReset->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'message' => 'Token za reset lozinke je istekao. Molimo zatražite novi.',
            ], 422);
        }

        // Verify token
        if (!Hash::check($request->token, $passwordReset->token)) {
            return response()->json([
                'message' => 'Token za reset lozinke nije validan.',
            ], 422);
        }

        // Find user
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'message' => 'Korisnik nije pronađen.',
            ], 404);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ]);

        // Delete used token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Lozinka je uspješno resetovana.',
        ], 200);
    }

    /**
     * Get user avatar
     */
    public function getAvatar(Request $request, $userId = null)
    {
        \Log::info('Avatar: Endpoint called', [
            'userId' => $userId,
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'has_token_query' => $request->has('token'),
            'has_bearer_token' => $request->bearerToken() !== null
        ]);
        
        // Support token query parameter for img tag requests (can't send Bearer token in img src)
        $token = $request->query('token') ?? $request->bearerToken();
        
        $currentUser = null;
        if ($token) {
            // Validate token and get user
            try {
                $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                if ($personalAccessToken && (!$personalAccessToken->expires_at || $personalAccessToken->expires_at > now())) {
                    $currentUser = $personalAccessToken->tokenable;
                }
            } catch (\Exception $e) {
                \Log::warning('Avatar: Token validation failed', ['error' => $e->getMessage()]);
            }
        }
        
        // Fallback to standard Bearer token authentication if no token in query
        if (!$currentUser) {
            try {
                $currentUser = $request->user();
            } catch (\Exception $e) {
                \Log::warning('Avatar: User authentication failed', ['error' => $e->getMessage()]);
            }
        }
        
        // If no user authenticated, allow viewing own avatar (for public profiles)
        $targetUserId = $userId ?? ($currentUser ? $currentUser->id : null);
        
        if (!$targetUserId) {
            \Log::warning('Avatar: No target user ID', ['userId' => $userId, 'currentUser' => $currentUser?->id]);
            abort(404);
        }
        
        $user = User::find($targetUserId);
        if (!$user) {
            \Log::warning('Avatar: User not found', ['userId' => $targetUserId]);
            abort(404);
        }
        
        if (!$user->avatar) {
            \Log::info('Avatar: User has no avatar', ['userId' => $targetUserId]);
            abort(404);
        }

        // Build the correct path - avatar is stored relative to public disk
        $avatarPath = Storage::disk('public')->path($user->avatar);
        
        \Log::info('Avatar: Checking file', [
            'userId' => $targetUserId,
            'avatar_db_path' => $user->avatar,
            'full_path' => $avatarPath,
            'exists' => file_exists($avatarPath),
            'storage_exists' => Storage::disk('public')->exists($user->avatar)
        ]);
        
        if (!Storage::disk('public')->exists($user->avatar)) {
            \Log::error('Avatar: File not found in storage', [
                'userId' => $targetUserId,
                'avatar_db_path' => $user->avatar,
                'full_path' => $avatarPath,
                'storage_path' => Storage::disk('public')->path($user->avatar)
            ]);
            abort(404);
        }

        // Detect content type from file extension
        $extension = strtolower(pathinfo($avatarPath, PATHINFO_EXTENSION));
        $contentTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
        ];
        $contentType = $contentTypes[$extension] ?? 'image/png';

        \Log::info('Avatar: Returning file', [
            'userId' => $targetUserId,
            'avatar_path' => $user->avatar,
            'content_type' => $contentType,
            'file_size' => filesize($avatarPath)
        ]);

        return response()->file($avatarPath, [
            'Content-Type' => $contentType,
            'Cache-Control' => 'private, max-age=3600',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET',
        ]);
    }

    /**
     * Get user profile with all details
     */
    public function getProfile(Request $request, $userId = null)
    {
        try {
            $currentUser = $request->user();
            $targetUserId = $userId ?? $currentUser->id;
            
            // Check if admin is viewing another user's profile
            $isAdminView = false;
            try {
                $isAdminView = $userId !== null && $currentUser->hasRole('admin');
            } catch (\Exception $e) {
                // If hasRole fails, assume not admin
            }
            
            $canView = ($targetUserId == $currentUser->id) || $isAdminView;
            
            if (!$canView) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $user = User::find($targetUserId);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Get user settings (check if table exists)
            $settings = null;
            try {
                if (Schema::hasTable('user_settings')) {
                    $settings = DB::table('user_settings')
                        ->where('user_id', $targetUserId)
                        ->first();
                }
            } catch (\Exception $e) {
                // Table doesn't exist, use defaults
            }

            // Get notification settings (check if table exists)
            $notificationSettings = null;
            try {
                if (Schema::hasTable('notification_settings')) {
                    $notificationSettings = DB::table('notification_settings')
                        ->where('user_id', $targetUserId)
                        ->first();
                }
            } catch (\Exception $e) {
                // Table doesn't exist, use defaults
            }

            // Get last login IP from sessions (check if table exists)
            $lastLoginIp = null;
            try {
                if (Schema::hasTable('sessions')) {
                    $lastSession = DB::table('sessions')
                        ->where('user_id', $targetUserId)
                        ->orderBy('last_activity', 'desc')
                        ->first();
                    $lastLoginIp = $lastSession ? ($lastSession->ip_address ?? null) : null;
                }
            } catch (\Exception $e) {
                // Table doesn't exist or query failed
            }

            // Get role safely
            $role = 'user';
            $roles = collect(['user']);
            try {
                $roleNames = $user->getRoleNames();
                $role = $roleNames->first() ?? 'user';
                $roles = $roleNames;
            } catch (\Exception $e) {
                // Roles not available, use defaults
            }

            // Get password_changed_at safely
            $passwordChangedAt = null;
            try {
                if (Schema::hasColumn('users', 'password_changed_at')) {
                    $passwordChangedAt = $user->password_changed_at;
                }
            } catch (\Exception $e) {
                // Column doesn't exist
            }

            return response()->json([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->email, // Username is email
                'phone' => $user->phone ?? null,
                'avatar' => $user->avatar ?? null,
                'locale' => $user->locale ?? 'bs',
                'theme' => $user->theme ?? 'light',
                'timezone' => $user->timezone ?? 'Europe/Sarajevo',
                'role' => $role,
                'roles' => $roles,
                'is_active' => $user->is_active ?? true,
                'password_changed_at' => $passwordChangedAt,
                'last_login_at' => $user->last_login_at ?? null,
                'last_login_ip' => $lastLoginIp,
                'settings' => $settings ? [
                    'default_module' => $settings->default_module ?? null,
                    'table_rows_per_page' => $settings->table_rows_per_page ?? 25,
                    'auto_logout_timeout' => $settings->auto_logout_timeout ?? 0,
                ] : [
                    'default_module' => null,
                    'table_rows_per_page' => 25,
                    'auto_logout_timeout' => 0,
                ],
                'notification_settings' => $notificationSettings ? [
                    'email_enabled' => $notificationSettings->email_enabled ?? true,
                    'desktop_enabled' => $notificationSettings->desktop_enabled ?? true,
                    'sound_enabled' => $notificationSettings->sound_enabled ?? true,
                    'settings' => $notificationSettings->settings ? (json_decode($notificationSettings->settings, true) ?? []) : [],
                ] : [
                    'email_enabled' => true,
                    'desktop_enabled' => true,
                    'sound_enabled' => true,
                    'settings' => [],
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getProfile: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Error loading profile',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request, $userId = null)
    {
        try {
            $currentUser = $request->user();
            $targetUserId = $userId ?? $currentUser->id;
            
            // Log incoming request - check all data
            \Log::info('Profile update request', [
                'user_id' => $targetUserId,
                'method' => $request->method(),
                'content_type' => $request->header('Content-Type'),
                'all_input' => $request->all(),
                'request_data' => $request->except(['avatar']), // Exclude file from log
                'has_avatar' => $request->hasFile('avatar'),
                'input_name' => $request->input('name'),
                'input_email' => $request->input('email'),
                'raw_content' => $request->getContent() ? 'has content' : 'no content',
                'request_keys' => array_keys($request->all()),
            ]);
            
            // Debug: log FormData entries
            if ($request->header('Content-Type') && str_contains($request->header('Content-Type'), 'multipart/form-data')) {
                \Log::info('FormData detected', [
                    'name' => $request->input('name'),
                    'email' => $request->input('email'),
                    'phone' => $request->input('phone'),
                    'locale' => $request->input('locale'),
                ]);
            }
            
            // Check if admin is updating another user's profile
            $isAdminView = false;
            try {
                $isAdminView = $userId !== null && $currentUser->hasRole('admin');
            } catch (\Exception $e) {
                // If hasRole fails, assume not admin
            }
            
            $canUpdate = ($targetUserId == $currentUser->id) || $isAdminView;
            
            if (!$canUpdate) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $user = User::find($targetUserId);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Validation rules
            $rules = [
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $targetUserId,
                'phone' => 'nullable|string|max:50',
                'locale' => 'sometimes|in:bs,en',
                'theme' => 'sometimes|in:light,dark,auto',
                'timezone' => 'sometimes|string|max:50',
            ];

            // Admin can update more fields
            if ($isAdminView) {
                $rules['is_active'] = 'sometimes|boolean';
            }

            $request->validate($rules);

            // Update user basic info - use filled() to check if value is present and not empty
            // Also try all() method for FormData compatibility
            $allData = $request->all();
            
            // Check which columns exist in users table
            $hasTimezone = Schema::hasColumn('users', 'timezone');
            
            $updateData = [];
            if (!empty($allData['name'])) $updateData['name'] = $allData['name'];
            if (!empty($allData['email'])) $updateData['email'] = $allData['email'];
            if (isset($allData['phone'])) $updateData['phone'] = $allData['phone']; // Can be empty/null
            if (!empty($allData['locale'])) $updateData['locale'] = $allData['locale'];
            if (!empty($allData['theme'])) $updateData['theme'] = $allData['theme'];
            if ($hasTimezone && !empty($allData['timezone'])) $updateData['timezone'] = $allData['timezone'];
            if ($isAdminView && isset($allData['is_active'])) $updateData['is_active'] = (bool) $allData['is_active'];
            
            // Fallback to input() if all() doesn't work
            if (empty($updateData)) {
                if ($request->filled('name')) $updateData['name'] = $request->input('name');
                if ($request->filled('email')) $updateData['email'] = $request->input('email');
                if ($request->has('phone')) $updateData['phone'] = $request->input('phone');
                if ($request->filled('locale')) $updateData['locale'] = $request->input('locale');
                if ($request->filled('theme')) $updateData['theme'] = $request->input('theme');
                if ($hasTimezone && $request->filled('timezone')) $updateData['timezone'] = $request->input('timezone');
                if ($isAdminView && $request->has('is_active')) $updateData['is_active'] = $request->boolean('is_active');
            }

            \Log::info('Update data prepared', [
                'user_id' => $targetUserId,
                'update_data' => $updateData,
            ]);

            if (!empty($updateData)) {
                $user->update($updateData);
                \Log::info('User basic info updated', [
                    'user_id' => $targetUserId,
                    'updated_fields' => array_keys($updateData),
                ]);
            } else {
                \Log::warning('No update data provided', [
                    'user_id' => $targetUserId,
                    'request_keys' => array_keys($request->all()),
                ]);
            }

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            try {
                $request->validate([
                    'avatar' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
                ]);

                $avatar = $request->file('avatar');
                $extension = $avatar->getClientOriginalExtension();
                
                // Ensure avatars directory exists
                if (!Storage::disk('public')->exists('avatars')) {
                    Storage::disk('public')->makeDirectory('avatars', 0755, true);
                }
                
                $filename = 'avatars/' . $targetUserId . '_' . time() . '.' . $extension;
                
                // Delete old avatar if exists
                if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                    Storage::disk('public')->delete($user->avatar);
                }
                
                // Store the file using Storage facade for better control
                $stored = Storage::disk('public')->putFileAs('avatars', $avatar, $targetUserId . '_' . time() . '.' . $extension);
                
                \Log::info('Avatar storage attempt', [
                    'user_id' => $targetUserId,
                    'stored_path' => $stored,
                    'exists' => $stored ? Storage::disk('public')->exists($stored) : false,
                    'full_path' => $stored ? Storage::disk('public')->path($stored) : null,
                ]);
                
                // Verify file was stored
                if (!$stored || !Storage::disk('public')->exists($stored)) {
                    \Log::error('Avatar storage failed', [
                        'user_id' => $targetUserId,
                        'stored' => $stored,
                        'exists' => $stored ? Storage::disk('public')->exists($stored) : false,
                    ]);
                    throw new \Exception('File was not stored successfully');
                }
                
                // Update user with new avatar path (relative to public disk)
                $user->avatar = $stored;
                $user->save();
                
                \Log::info('Avatar uploaded successfully', [
                    'user_id' => $targetUserId,
                    'avatar_path_in_db' => $stored,
                    'full_path' => Storage::disk('public')->path($stored),
                    'url_path' => Storage::disk('public')->url($stored),
                ]);
            } catch (\Exception $e) {
                \Log::error('Error uploading avatar: ' . $e->getMessage(), [
                    'user_id' => $targetUserId,
                    'error' => $e->getTraceAsString(),
                ]);
                // Return error to user
                return response()->json([
                    'message' => 'Profile updated, but avatar upload failed: ' . $e->getMessage()
                ], 200); // Still return 200 but with warning message
            }
        }

        // Update user settings
        if ($request->has('settings') || $request->has('settings.default_module')) {
            $settings = $request->input('settings', []);
            
            // If settings come as nested keys (from FormData), parse them
            if (empty($settings)) {
                $settings = [
                    'default_module' => $request->input('settings.default_module'),
                    'table_rows_per_page' => $request->input('settings.table_rows_per_page'),
                    'auto_logout_timeout' => $request->input('settings.auto_logout_timeout'),
                ];
                // Remove empty values
                $settings = array_filter($settings, function($value) {
                    return $value !== null && $value !== '';
                });
            }
            
            $settingsData = [
                'default_module' => $settings['default_module'] ?? null,
                'table_rows_per_page' => $settings['table_rows_per_page'] ?? 25,
                'auto_logout_timeout' => $settings['auto_logout_timeout'] ?? 0,
                'updated_at' => now(),
            ];

            $existingSettings = DB::table('user_settings')->where('user_id', $targetUserId)->first();
            
            if ($existingSettings) {
                DB::table('user_settings')
                    ->where('user_id', $targetUserId)
                    ->update($settingsData);
            } else {
                $settingsData['user_id'] = $targetUserId;
                $settingsData['created_at'] = now();
                DB::table('user_settings')->insert($settingsData);
            }
        }

        // Update notification settings
        if ($request->has('notification_settings') || $request->has('notification_settings.email_enabled')) {
            $notifSettings = $request->input('notification_settings', []);
            
            // If settings come as nested keys (from FormData), parse them
            if (empty($notifSettings)) {
                $notifSettings = [
                    'email_enabled' => $request->input('notification_settings.email_enabled', '0'),
                    'desktop_enabled' => $request->input('notification_settings.desktop_enabled', '0'),
                    'sound_enabled' => $request->input('notification_settings.sound_enabled', '0'),
                ];
            }
            
            $notifData = [
                'email_enabled' => $notifSettings['email_enabled'] ?? true,
                'desktop_enabled' => $notifSettings['desktop_enabled'] ?? true,
                'sound_enabled' => $notifSettings['sound_enabled'] ?? true,
                'settings' => json_encode($notifSettings['settings'] ?? []),
                'updated_at' => now(),
            ];

            $existingNotif = DB::table('notification_settings')->where('user_id', $targetUserId)->first();
            
            if ($existingNotif) {
                DB::table('notification_settings')
                    ->where('user_id', $targetUserId)
                    ->update($notifData);
            } else {
                $notifData['user_id'] = $targetUserId;
                $notifData['created_at'] = now();
                DB::table('notification_settings')->insert($notifData);
            }
        }

            // Refresh user model to get latest data
            $user->refresh();

            \Log::info('Profile update completed successfully', [
                'user_id' => $targetUserId,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'user_avatar' => $user->avatar,
            ]);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => [
                    'avatar' => $user->avatar,
                    'name' => $user->name,
                    'email' => $user->email,
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error in updateProfile', [
                'user_id' => $targetUserId ?? null,
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error in updateProfile: ' . $e->getMessage(), [
                'user_id' => $targetUserId ?? null,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Error updating profile',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request, $userId = null)
    {
        $currentUser = $request->user();
        $targetUserId = $userId ?? $currentUser->id;
        
        // Check if admin is changing another user's password (reset)
        $isAdminReset = $userId !== null && $currentUser->hasRole('admin');
        $isOwnPassword = ($targetUserId == $currentUser->id);
        
        if (!$isAdminReset && !$isOwnPassword) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = User::find($targetUserId);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Validation
        if ($isOwnPassword) {
            $request->validate([
                'current_password' => 'required',
                'password' => 'required|string|min:8|confirmed',
            ]);

            // Verify current password
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json(['error' => 'Current password is incorrect'], 422);
            }
        } else {
            // Admin reset password
            $request->validate([
                'password' => 'required|string|min:8|confirmed',
            ]);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ]);

        // Log activity
        activity()
            ->causedBy($currentUser)
            ->performedOn($user)
            ->withProperties(['changed_by' => $currentUser->id])
            ->log($isAdminReset ? 'password reset by admin' : 'password changed');

        // If admin reset, logout all other devices
        if ($isAdminReset) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $targetUserId)
                ->where('id', '!=', $currentUser->currentAccessToken()->id ?? 0)
                ->delete();
        }

        return response()->json(['message' => $isAdminReset ? 'Password reset successfully' : 'Password changed successfully']);
    }

    /**
     * Logout from all devices
     */
    public function logoutAllDevices(Request $request, $userId = null)
    {
        $currentUser = $request->user();
        $targetUserId = $userId ?? $currentUser->id;
        
        // Check if admin is logging out another user
        $isAdminAction = $userId !== null && $currentUser->hasRole('admin');
        $isOwnAccount = ($targetUserId == $currentUser->id);
        
        if (!$isAdminAction && !$isOwnAccount) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Delete all tokens except current one (if own account)
        $query = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $targetUserId);

        if ($isOwnAccount && $currentUser->currentAccessToken()) {
            $query->where('id', '!=', $currentUser->currentAccessToken()->id);
        }

        $query->delete();

        // Delete sessions
        DB::table('sessions')
            ->where('user_id', $targetUserId)
            ->delete();

        return response()->json(['message' => 'Logged out from all devices successfully']);
    }

    /**
     * Get user activity log
     */
    public function getActivity(Request $request, $userId = null)
    {
        try {
            $currentUser = $request->user();
            $targetUserId = $userId ?? $currentUser->id;
            
            // Check if admin is viewing another user's activity
            $isAdminView = false;
            try {
                $isAdminView = $userId !== null && $currentUser->hasRole('admin');
            } catch (\Exception $e) {
                // If hasRole fails, assume not admin
            }
            
            $canView = ($targetUserId == $currentUser->id) || $isAdminView;
            
            if (!$canView) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Get activity logs related to user (check if table exists)
            $activities = collect([]);
            try {
                if (Schema::hasTable('activity_log')) {
                    $userClass = 'App\\Models\\User';
                    $activities = DB::table('activity_log')
                        ->where(function($query) use ($targetUserId, $userClass) {
                            $query->where('causer_id', $targetUserId)
                                  ->orWhere(function($q) use ($targetUserId, $userClass) {
                                      $q->where('subject_id', $targetUserId)
                                        ->where('subject_type', $userClass);
                                  });
                        })
                        ->orderBy('created_at', 'desc')
                        ->limit(50)
                        ->get()
                        ->map(function($activity) {
                            return [
                                'id' => $activity->id ?? null,
                                'description' => $activity->description ?? 'N/A',
                                'event' => $activity->event ?? null,
                                'created_at' => $activity->created_at ?? now()->toDateTimeString(),
                                'properties' => $activity->properties ? (json_decode($activity->properties, true) ?? null) : null,
                            ];
                        });
                }
            } catch (\Exception $e) {
                \Log::warning('Error fetching activity_log: ' . $e->getMessage());
                // Continue with empty activities collection
            }

            // Get login activities from sessions (check if table exists)
            $sessions = collect([]);
            try {
                if (Schema::hasTable('sessions')) {
                    $sessions = DB::table('sessions')
                        ->where('user_id', $targetUserId)
                        ->orderBy('last_activity', 'desc')
                        ->limit(10)
                        ->get()
                        ->map(function($session) {
                            return [
                                'description' => 'Login',
                                'ip_address' => $session->ip_address ?? null,
                                'user_agent' => $session->user_agent ?? null,
                                'created_at' => isset($session->last_activity) ? date('Y-m-d H:i:s', $session->last_activity) : now()->toDateTimeString(),
                            ];
                        });
                }
            } catch (\Exception $e) {
                \Log::warning('Error fetching sessions: ' . $e->getMessage());
                // Continue with empty sessions collection
            }

            return response()->json([
                'activities' => $activities,
                'logins' => $sessions,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getActivity: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Error loading activity',
                'message' => $e->getMessage(),
                'activities' => [],
                'logins' => [],
            ], 500);
        }
    }

    /**
     * Admin: Toggle user active status
     */
    public function toggleUserStatus(Request $request, $userId)
    {
        $currentUser = $request->user();
        
        if (!$currentUser->hasRole('admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->update(['is_active' => !$user->is_active]);

        activity()
            ->causedBy($currentUser)
            ->performedOn($user)
            ->log('user ' . ($user->is_active ? 'activated' : 'deactivated'));

        return response()->json([
            'message' => 'User status updated successfully',
            'is_active' => $user->is_active,
        ]);
    }

    /**
     * Admin: Assign role to user
     */
    public function assignRole(Request $request, $userId)
    {
        $currentUser = $request->user();
        
        if (!$currentUser->hasRole('admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Sync roles (replace all)
        $user->syncRoles([$request->role]);

        activity()
            ->causedBy($currentUser)
            ->performedOn($user)
            ->withProperties(['role' => $request->role])
            ->log('role assigned');

        return response()->json(['message' => 'Role assigned successfully']);
    }
}

