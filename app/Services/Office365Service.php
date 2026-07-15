<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;

class Office365Service
{
    private $clientId;
    private $clientSecret;
    private $tenantId;
    private $redirectUri;
    private $graphApiUrl = 'https://graph.microsoft.com/v1.0';

    public function __construct()
    {
        $this->clientId = env('OFFICE365_CLIENT_ID');
        $this->clientSecret = env('OFFICE365_CLIENT_SECRET');
        $this->tenantId = env('OFFICE365_TENANT_ID');
        $this->redirectUri = env('OFFICE365_REDIRECT_URI', url('/api/office365/callback'));
    }

    /**
     * Get authorization URL for OAuth2
     */
    public function getAuthorizationUrl($userId): string
    {
        if (empty($this->clientId) || empty($this->tenantId)) {
            $missingParams = [];
            if (empty($this->clientId)) $missingParams[] = 'OFFICE365_CLIENT_ID';
            if (empty($this->tenantId)) $missingParams[] = 'OFFICE365_TENANT_ID';
            
            $message = 'Office 365 konfiguracija nije potpuna. ' . 
                       'Molimo dodajte sledeće parametre u .env fajl: ' . implode(', ', $missingParams) . '. ' .
                       'Za detaljna uputstva o konfigurisanju Office 365 integracije, proverite fajl OFFICE365_SETUP.md u korenu projekta. ' .
                       'Potrebno je kreirati Azure App Registration i dobiti Client ID i Tenant ID iz Azure Portal-a.';
            
            throw new \Exception($message);
        }
        
        // Use default redirect URI if not set
        if (empty($this->redirectUri)) {
            $this->redirectUri = url('/api/office365/callback');
        }
        
        $state = base64_encode(json_encode(['user_id' => $userId, 'timestamp' => time()]));
        
        $params = [
            'client_id' => $this->clientId,
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri,
            'response_mode' => 'query',
            'scope' => 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/User.Read offline_access',
            'state' => $state,
        ];

        $authUrl = "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/authorize?" . http_build_query($params);
        
        return $authUrl;
    }

    /**
     * Exchange authorization code for access token
     */
    public function getAccessToken($code): ?array
    {
        try {
            $response = Http::asForm()->post("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'code' => $code,
                'redirect_uri' => $this->redirectUri,
                'grant_type' => 'authorization_code',
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Failed to get access token', ['response' => $response->body()]);
            return null;
        } catch (\Exception $e) {
            Log::error('Exception getting access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Refresh access token
     */
    public function refreshAccessToken($refreshToken): ?array
    {
        try {
            $response = Http::asForm()->post("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
                'scope' => 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/User.Read offline_access',
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Failed to refresh access token', ['response' => $response->body()]);
            return null;
        } catch (\Exception $e) {
            Log::error('Exception refreshing access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get or refresh valid access token for user
     */
    private function getValidAccessToken($userId): ?string
    {
        if (!Schema::hasTable('office365_connections')) {
            return null;
        }
        
        try {
            $connection = DB::table('office365_connections')
                ->where('user_id', $userId)
                ->where('is_active', true)
                ->first();
            
            if (!$connection) {
                return null;
            }

            // Check if token is expired or will expire in next 5 minutes
            if (now()->addMinutes(5)->greaterThan($connection->expires_at)) {
                // Refresh token
                $refreshToken = Crypt::decryptString($connection->refresh_token);
                $tokenData = $this->refreshAccessToken($refreshToken);
                
                if ($tokenData) {
                    DB::table('office365_connections')->where('user_id', $userId)->update([
                        'access_token' => Crypt::encryptString($tokenData['access_token']),
                        'refresh_token' => isset($tokenData['refresh_token']) ? Crypt::encryptString($tokenData['refresh_token']) : $connection->refresh_token,
                        'expires_at' => now()->addSeconds($tokenData['expires_in'] ?? 3600),
                        'updated_at' => now(),
                    ]);
                    
                    return $tokenData['access_token'];
                }
                
                return null;
            }

            return Crypt::decryptString($connection->access_token);
        } catch (\Exception $e) {
            Log::error('Error getting valid access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Save connection to database
     */
    public function saveConnection($userId, $tokenData, $email): bool
    {
        if (!Schema::hasTable('office365_connections')) {
            Log::error('office365_connections table does not exist. Please run migrations.');
            return false;
        }
        
        try {
            $expiresAt = now()->addSeconds($tokenData['expires_in'] ?? 3600);
            
            DB::table('office365_connections')->updateOrInsert(
                ['user_id' => $userId],
                [
                    'access_token' => Crypt::encryptString($tokenData['access_token']),
                    'refresh_token' => Crypt::encryptString($tokenData['refresh_token'] ?? ''),
                    'expires_at' => $expiresAt,
                    'scope' => $tokenData['scope'] ?? null,
                    'email' => $email,
                    'is_active' => true,
                    'last_sync_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
            
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to save Office365 connection: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send email via Microsoft Graph API
     */
    public function sendEmail($userId, $to, $subject, $body, $isHtml = true, $attachments = []): bool
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            throw new \Exception('No valid access token. Please reconnect your Office 365 account.');
        }

        try {
            $message = [
                'message' => [
                    'subject' => $subject,
                    'body' => [
                        'contentType' => $isHtml ? 'HTML' : 'Text',
                        'content' => $body,
                    ],
                    'toRecipients' => array_map(function($email) {
                        return ['emailAddress' => ['address' => $email]];
                    }, is_array($to) ? $to : [$to]),
                ],
            ];

            // Add attachments if provided
            if (!empty($attachments)) {
                $message['message']['attachments'] = array_map(function($attachment) {
                    $fileContent = base64_encode(file_get_contents($attachment['path']));
                    return [
                        '@odata.type' => '#microsoft.graph.fileAttachment',
                        'name' => $attachment['name'],
                        'contentType' => $attachment['mime_type'] ?? 'application/octet-stream',
                        'contentBytes' => $fileContent,
                    ];
                }, $attachments);
            }

            $response = Http::withToken($accessToken)
                ->post("{$this->graphApiUrl}/me/sendMail", $message);

            if ($response->successful()) {
                return true;
            }

            Log::error('Failed to send email', ['response' => $response->body(), 'status' => $response->status()]);
            return false;
        } catch (\Exception $e) {
            Log::error('Exception sending email: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get user email from Microsoft Graph
     */
    public function getUserEmail($userId): ?string
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return null;
        }

        try {
            $response = Http::withToken($accessToken)->get("{$this->graphApiUrl}/me");
            
            if ($response->successful()) {
                $user = $response->json();
                return $user['mail'] ?? $user['userPrincipalName'] ?? null;
            }
            
            return null;
        } catch (\Exception $e) {
            Log::error('Exception getting user email: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get calendars
     */
    public function getCalendars($userId): array
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return [];
        }

        try {
            $response = Http::withToken($accessToken)->get("{$this->graphApiUrl}/me/calendars");
            
            if ($response->successful()) {
                return $response->json()['value'] ?? [];
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting calendars: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get calendar events
     */
    public function getCalendarEvents($userId, $calendarId = null, $startDateTime = null, $endDateTime = null): array
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return [];
        }

        try {
            $endpoint = $calendarId 
                ? "{$this->graphApiUrl}/me/calendars/{$calendarId}/events"
                : "{$this->graphApiUrl}/me/events";
            
            $params = [];
            if ($startDateTime) {
                $params['$filter'] = "start/dateTime ge '{$startDateTime}'";
            }
            if ($endDateTime) {
                $filter = $params['$filter'] ?? '';
                $params['$filter'] = $filter ? "{$filter} and end/dateTime le '{$endDateTime}'" : "end/dateTime le '{$endDateTime}'";
            }
            
            $response = Http::withToken($accessToken)->get($endpoint, $params);
            
            if ($response->successful()) {
                return $response->json()['value'] ?? [];
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting calendar events: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get OneDrive files
     */
    public function getOneDriveFiles($userId, $folderId = null): array
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return [];
        }

        try {
            $endpoint = $folderId 
                ? "{$this->graphApiUrl}/me/drive/items/{$folderId}/children"
                : "{$this->graphApiUrl}/me/drive/root/children";
            
            $response = Http::withToken($accessToken)->get($endpoint);
            
            if ($response->successful()) {
                return $response->json()['value'] ?? [];
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting OneDrive files: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get SharePoint sites
     */
    public function getSharePointSites($userId): array
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return [];
        }

        try {
            $response = Http::withToken($accessToken)->get("{$this->graphApiUrl}/sites?search=*");
            
            if ($response->successful()) {
                return $response->json()['value'] ?? [];
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting SharePoint sites: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get Teams
     */
    public function getTeams($userId): array
    {
        $accessToken = $this->getValidAccessToken($userId);
        
        if (!$accessToken) {
            return [];
        }

        try {
            $response = Http::withToken($accessToken)->get("{$this->graphApiUrl}/me/joinedTeams");
            
            if ($response->successful()) {
                return $response->json()['value'] ?? [];
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting Teams: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Check if user has active connection
     */
    public function hasActiveConnection($userId): bool
    {
        if (!Schema::hasTable('office365_connections')) {
            return false;
        }
        
        try {
            $connection = DB::table('office365_connections')
                ->where('user_id', $userId)
                ->where('is_active', true)
                ->first();
            
            return $connection !== null;
        } catch (\Exception $e) {
            Log::error('Error checking Office365 connection: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Disconnect Office 365 account
     */
    public function disconnect($userId): bool
    {
        if (!Schema::hasTable('office365_connections')) {
            return false;
        }
        
        try {
            DB::table('office365_connections')
                ->where('user_id', $userId)
                ->update(['is_active' => false, 'updated_at' => now()]);
            
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to disconnect Office365: ' . $e->getMessage());
            return false;
        }
    }
}

