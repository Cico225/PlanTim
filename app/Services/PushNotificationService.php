<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PushNotificationService
{
    /**
     * VAPID keys for Web Push
     * Generate new keys at: https://vapidkeys.com/
     */
    private static function getVapidKeys(): array
    {
        return [
            'subject' => config('app.url'),
            'publicKey' => config('services.webpush.public_key', env('VAPID_PUBLIC_KEY', '')),
            'privateKey' => config('services.webpush.private_key', env('VAPID_PRIVATE_KEY', '')),
        ];
    }

    /**
     * Subscribe a user to push notifications
     */
    public static function subscribe(int $userId, array $subscription, ?string $userAgent = null): bool
    {
        try {
            $endpoint = $subscription['endpoint'] ?? null;
            $keys = $subscription['keys'] ?? [];
            
            if (!$endpoint || empty($keys['p256dh']) || empty($keys['auth'])) {
                Log::warning('PushNotification: Invalid subscription data', [
                    'user_id' => $userId,
                    'has_endpoint' => !empty($endpoint),
                    'has_keys' => !empty($keys)
                ]);
                return false;
            }

            // Determine device type from user agent
            $deviceType = 'web';
            if ($userAgent) {
                if (preg_match('/Mobile|Android|iPhone|iPad/i', $userAgent)) {
                    $deviceType = 'mobile';
                }
            }

            // Check if endpoint already exists
            $existing = DB::table('push_subscriptions')
                ->where('endpoint', $endpoint)
                ->first();

            if ($existing) {
                // Update existing subscription
                DB::table('push_subscriptions')
                    ->where('endpoint', $endpoint)
                    ->update([
                        'user_id' => $userId,
                        'p256dh_key' => $keys['p256dh'],
                        'auth_token' => $keys['auth'],
                        'user_agent' => $userAgent,
                        'device_type' => $deviceType,
                        'is_active' => true,
                        'last_used_at' => now(),
                        'updated_at' => now(),
                    ]);
            } else {
                // Create new subscription
                DB::table('push_subscriptions')->insert([
                    'user_id' => $userId,
                    'endpoint' => $endpoint,
                    'p256dh_key' => $keys['p256dh'],
                    'auth_token' => $keys['auth'],
                    'user_agent' => $userAgent,
                    'device_type' => $deviceType,
                    'is_active' => true,
                    'last_used_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Log::info('PushNotification: User subscribed', [
                'user_id' => $userId,
                'device_type' => $deviceType
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('PushNotification: Failed to subscribe user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    public static function unsubscribe(string $endpoint): bool
    {
        try {
            $deleted = DB::table('push_subscriptions')
                ->where('endpoint', $endpoint)
                ->delete();

            return $deleted > 0;
        } catch (\Exception $e) {
            Log::error('PushNotification: Failed to unsubscribe', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send push notification to a specific user
     */
    public static function sendToUser(int $userId, string $title, string $body, ?string $icon = null, ?string $url = null, array $data = []): int
    {
        try {
            $subscriptions = DB::table('push_subscriptions')
                ->where('user_id', $userId)
                ->where('is_active', true)
                ->get();

            if ($subscriptions->isEmpty()) {
                return 0;
            }

            $payload = [
                'title' => $title,
                'body' => $body,
                'icon' => $icon ?? '/icons/notification-icon.png',
                'badge' => '/icons/badge-icon.png',
                'url' => $url ?? '/',
                'data' => $data,
                'timestamp' => time() * 1000,
            ];

            $successCount = 0;
            foreach ($subscriptions as $subscription) {
                if (self::sendPushNotification($subscription, $payload)) {
                    $successCount++;
                    // Update last used
                    DB::table('push_subscriptions')
                        ->where('id', $subscription->id)
                        ->update(['last_used_at' => now()]);
                }
            }

            return $successCount;
        } catch (\Exception $e) {
            Log::error('PushNotification: Failed to send to user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Send push notification to multiple users
     */
    public static function sendToUsers(array $userIds, string $title, string $body, ?string $icon = null, ?string $url = null, array $data = []): int
    {
        $totalSent = 0;
        foreach ($userIds as $userId) {
            $totalSent += self::sendToUser($userId, $title, $body, $icon, $url, $data);
        }
        return $totalSent;
    }

    /**
     * Send the actual push notification
     */
    private static function sendPushNotification($subscription, array $payload): bool
    {
        try {
            $vapid = self::getVapidKeys();
            
            // If VAPID keys are not configured, log and skip
            if (empty($vapid['publicKey']) || empty($vapid['privateKey'])) {
                // Use fallback: Store notification for polling
                self::storeForPolling($subscription->user_id, $payload);
                return true;
            }

            // Build the push notification
            $endpoint = $subscription->endpoint;
            $p256dh = $subscription->p256dh_key;
            $auth = $subscription->auth_token;

            // Create the encrypted payload using web-push library
            // For now, we'll use a simple HTTP POST for FCM endpoints
            // and store for polling for other endpoints
            
            if (strpos($endpoint, 'fcm.googleapis.com') !== false || 
                strpos($endpoint, 'firebase') !== false) {
                // Firebase Cloud Messaging endpoint
                return self::sendViaFCM($endpoint, $payload);
            }

            // For other endpoints, store for polling (fallback)
            self::storeForPolling($subscription->user_id, $payload);
            return true;

        } catch (\Exception $e) {
            Log::error('PushNotification: Failed to send', [
                'error' => $e->getMessage(),
                'endpoint' => $subscription->endpoint ?? 'unknown'
            ]);
            
            // Mark subscription as inactive if it fails
            if (isset($subscription->id)) {
                DB::table('push_subscriptions')
                    ->where('id', $subscription->id)
                    ->update(['is_active' => false]);
            }
            
            return false;
        }
    }

    /**
     * Send via Firebase Cloud Messaging
     */
    private static function sendViaFCM(string $endpoint, array $payload): bool
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'TTL' => '86400',
                ])
                ->post($endpoint, [
                    'notification' => [
                        'title' => $payload['title'],
                        'body' => $payload['body'],
                        'icon' => $payload['icon'] ?? null,
                    ],
                    'data' => $payload['data'] ?? [],
                ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('PushNotification: FCM send failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Store notification for polling (fallback when Web Push is not available)
     */
    private static function storeForPolling(int $userId, array $payload): void
    {
        try {
            // Check if pending_push_notifications table exists
            if (!DB::getSchemaBuilder()->hasTable('pending_push_notifications')) {
                return;
            }

            DB::table('pending_push_notifications')->insert([
                'user_id' => $userId,
                'title' => $payload['title'],
                'body' => $payload['body'],
                'icon' => $payload['icon'] ?? null,
                'url' => $payload['url'] ?? null,
                'data' => json_encode($payload['data'] ?? []),
                'is_delivered' => false,
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Silently fail - this is just a fallback
            Log::debug('PushNotification: Could not store for polling', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get pending push notifications for polling
     */
    public static function getPendingNotifications(int $userId): array
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('pending_push_notifications')) {
                return [];
            }

            $notifications = DB::table('pending_push_notifications')
                ->where('user_id', $userId)
                ->where('is_delivered', false)
                ->orderBy('created_at', 'asc')
                ->get();

            // Mark as delivered
            $ids = $notifications->pluck('id')->toArray();
            if (!empty($ids)) {
                DB::table('pending_push_notifications')
                    ->whereIn('id', $ids)
                    ->update(['is_delivered' => true]);
            }

            return $notifications->map(function ($n) {
                return [
                    'title' => $n->title,
                    'body' => $n->body,
                    'icon' => $n->icon,
                    'url' => $n->url,
                    'data' => json_decode($n->data, true) ?? [],
                ];
            })->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Check if user has any active push subscriptions
     */
    public static function hasSubscription(int $userId): bool
    {
        return DB::table('push_subscriptions')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Get user's subscription count
     */
    public static function getSubscriptionCount(int $userId): int
    {
        return DB::table('push_subscriptions')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->count();
    }

    /**
     * Get VAPID public key for frontend
     */
    public static function getPublicKey(): string
    {
        return config('services.webpush.public_key', env('VAPID_PUBLIC_KEY', ''));
    }
}


