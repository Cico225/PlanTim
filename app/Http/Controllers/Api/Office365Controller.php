<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Office365Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class Office365Controller extends Controller
{
    protected $office365Service;

    public function __construct(Office365Service $office365Service)
    {
        $this->office365Service = $office365Service;
    }

    /**
     * Get authorization URL
     * Admin može da poveže Office 365 za bilo kog korisnika prosleđivanjem user_id parametra
     */
    public function getAuthUrl(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if user is admin
        if (!method_exists($user, 'hasAnyRole') || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Samo administratori mogu povezivati Office 365 integraciju'], 403);
        }

        // Ako je prosleđen user_id, koristimo ga (admin povezuje za drugog korisnika)
        // Inače koristimo ID trenutnog korisnika (admin povezuje za sebe)
        $targetUserId = $request->input('user_id', $user->id);

        try {
            $authUrl = $this->office365Service->getAuthorizationUrl($targetUserId);
            return response()->json(['auth_url' => $authUrl]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Office365 getAuthUrl error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle OAuth callback
     */
    public function callback(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        
        if (!$code) {
            return redirect('/admin?office365=error&message=' . urlencode('Authorization failed'));
        }

        try {
            $stateData = json_decode(base64_decode($state), true);
            $userId = $stateData['user_id'] ?? null;
            
            if (!$userId) {
                return redirect('/admin?office365=error&message=' . urlencode('Invalid state parameter'));
            }

            $tokenData = $this->office365Service->getAccessToken($code);
            
            if (!$tokenData) {
                return redirect('/admin?office365=error&message=' . urlencode('Failed to get access token'));
            }

            // Get user email from Microsoft Graph using the access token directly
            $email = '';
            try {
                $response = \Illuminate\Support\Facades\Http::withToken($tokenData['access_token'])
                    ->get('https://graph.microsoft.com/v1.0/me');
                
                if ($response->successful()) {
                    $user = $response->json();
                    $email = $user['mail'] ?? $user['userPrincipalName'] ?? '';
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to get user email in callback: ' . $e->getMessage());
            }
            
            // Save connection
            $this->office365Service->saveConnection($userId, $tokenData, $email);
            
            return redirect('/admin?office365=success&message=' . urlencode('Office 365 integracija uspešno povezana'));
        } catch (\Exception $e) {
            return redirect('/admin?office365=error&message=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Get connection status
     * Ako je admin, može da vidi status za bilo kog korisnika prosleđivanjem user_id parametra
     */
    public function getStatus(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Ako je admin i prosleđen user_id, vrati status za tog korisnika
        // Inače vrati status za trenutnog korisnika
        $targetUserId = $request->input('user_id', $user->id);
        
        // Admin može da vidi status bilo kog korisnika
        // Obični korisnici mogu da vide samo svoj status
        if ($targetUserId != $user->id) {
            if (!method_exists($user, 'hasAnyRole') || !$user->hasAnyRole(['admin', 'super-admin'])) {
                return response()->json(['message' => 'Nemate dozvolu da vidite status drugih korisnika'], 403);
            }
        }

        try {
            $hasConnection = $this->office365Service->hasActiveConnection($targetUserId);
            $connection = null;
            
            if ($hasConnection && \Illuminate\Support\Facades\Schema::hasTable('office365_connections')) {
                $dbConnection = \DB::table('office365_connections')
                    ->where('user_id', $targetUserId)
                    ->where('is_active', true)
                    ->first();
                
                if ($dbConnection) {
                    $connection = [
                        'email' => $dbConnection->email ?? null,
                        'last_sync_at' => $dbConnection->last_sync_at ?? null,
                        'connected_at' => $dbConnection->created_at ?? null,
                    ];
                }
            }

            return response()->json([
                'connected' => $hasConnection,
                'connection' => $connection,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Office365 getStatus error: ' . $e->getMessage());
            return response()->json([
                'connected' => false,
                'connection' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all Office 365 connections (admin only)
     */
    public function getAllConnections(Request $request)
    {
        // #region agent log
        \Illuminate\Support\Facades\Log::info('Office365 getAllConnections called', [
            'has_user' => $request->user() !== null,
            'user_id' => $request->user()?->id,
            'has_token' => $request->bearerToken() !== null,
        ]);
        // #endregion
        
        $user = $request->user();
        
        if (!$user) {
            // #region agent log
            \Illuminate\Support\Facades\Log::warning('Office365 getAllConnections: user is null', [
                'bearer_token' => $request->bearerToken() !== null ? 'present' : 'missing',
                'auth_header' => $request->header('Authorization') !== null ? 'present' : 'missing',
            ]);
            // #endregion
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if user is admin
        if (!method_exists($user, 'hasAnyRole') || !$user->hasAnyRole(['admin', 'super-admin'])) {
            // #region agent log
            \Illuminate\Support\Facades\Log::warning('Office365 getAllConnections: user is not admin', [
                'user_id' => $user->id,
                'has_method' => method_exists($user, 'hasAnyRole'),
            ]);
            // #endregion
            return response()->json(['message' => 'Samo administratori mogu videti sve konekcije'], 403);
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('office365_connections')) {
            return response()->json(['connections' => []]);
        }

        try {
            $connections = \DB::table('office365_connections')
                ->select(
                    'office365_connections.*',
                    'users.name as user_name',
                    'users.email as user_email'
                )
                ->leftJoin('users', 'office365_connections.user_id', '=', 'users.id')
                ->where('office365_connections.is_active', true)
                ->orderBy('office365_connections.created_at', 'desc')
                ->get();

            // Remove sensitive data
            $connections = $connections->map(function ($conn) {
                unset($conn->access_token, $conn->refresh_token);
                return $conn;
            });

            return response()->json(['connections' => $connections]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Office365 getAllConnections error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Disconnect Office 365
     */
    public function disconnect(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if user is admin
        if (!method_exists($user, 'hasAnyRole') || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Samo administratori mogu raskidati Office 365 integraciju'], 403);
        }

        // Ako je prosleđen user_id, raskidamo vezu za tog korisnika (admin raskida vezu za drugog korisnika)
        // Inače raskidamo vezu za trenutnog korisnika (admin raskida svoju vezu)
        $targetUserId = $request->input('user_id', $user->id);

        $success = $this->office365Service->disconnect($targetUserId);
        
        if ($success) {
            return response()->json(['message' => 'Office 365 integracija raskinuta']);
        }
        
        return response()->json(['message' => 'Greška pri raskidanju veze'], 500);
    }

    /**
     * Send email
     */
    public function sendEmail(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        // Check if user has active connection (any user with connection can send emails)
        if (!$this->office365Service->hasActiveConnection($user->id)) {
            return response()->json(['message' => 'Morate prvo povezati Office 365 nalog'], 403);
        }

        $validator = Validator::make($request->all(), [
            'to' => 'required|array',
            'to.*' => 'required|email',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'is_html' => 'boolean',
            'attachments' => 'nullable|array',
            'attachments.*.document_id' => 'nullable|exists:documents,id',
            'attachments.*.file_path' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Prepare attachments
        $attachments = [];
        if ($request->has('attachments') && is_array($request->attachments)) {
            foreach ($request->attachments as $attachment) {
                if (isset($attachment['document_id'])) {
                    // Get document from DMS
                    $document = \DB::table('documents')->find($attachment['document_id']);
                    if ($document && Storage::disk('public')->exists($document->path)) {
                        $attachments[] = [
                            'name' => $document->original_name ?? $document->name,
                            'path' => Storage::disk('public')->path($document->path),
                            'mime_type' => $document->mime_type ?? 'application/octet-stream',
                        ];
                    }
                } elseif (isset($attachment['file_path']) && Storage::disk('public')->exists($attachment['file_path'])) {
                    $attachments[] = [
                        'name' => basename($attachment['file_path']),
                        'path' => Storage::disk('public')->path($attachment['file_path']),
                        'mime_type' => $attachment['mime_type'] ?? 'application/octet-stream',
                    ];
                }
            }
        }

        try {
            $success = $this->office365Service->sendEmail(
                $user->id,
                $request->to,
                $request->subject,
                $request->body,
                $request->boolean('is_html', true),
                $attachments
            );

            if ($success) {
                return response()->json(['message' => 'Email uspešno poslat']);
            }

            return response()->json(['message' => 'Greška pri slanju emaila'], 500);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get calendars
     */
    public function getCalendars(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $calendars = $this->office365Service->getCalendars($user->id);
        
        return response()->json(['calendars' => $calendars]);
    }

    /**
     * Get calendar events
     */
    public function getCalendarEvents(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'calendar_id' => 'nullable|string',
            'start_date_time' => 'nullable|date',
            'end_date_time' => 'nullable|date|after:start_date_time',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $events = $this->office365Service->getCalendarEvents(
            $user->id,
            $request->calendar_id,
            $request->start_date_time,
            $request->end_date_time
        );
        
        return response()->json(['events' => $events]);
    }

    /**
     * Get OneDrive files
     */
    public function getOneDriveFiles(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $files = $this->office365Service->getOneDriveFiles($user->id, $request->folder_id);
        
        return response()->json(['files' => $files]);
    }

    /**
     * Get SharePoint sites
     */
    public function getSharePointSites(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $sites = $this->office365Service->getSharePointSites($user->id);
        
        return response()->json(['sites' => $sites]);
    }

    /**
     * Get Teams
     */
    public function getTeams(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $teams = $this->office365Service->getTeams($user->id);
        
        return response()->json(['teams' => $teams]);
    }
}

