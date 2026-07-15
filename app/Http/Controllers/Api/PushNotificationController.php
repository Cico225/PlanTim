<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Services\PushNotificationService;

class PushNotificationController extends Controller
{
    /**
     * Get VAPID public key for the frontend
     */
    public function getVapidPublicKey()
    {
        $publicKey = PushNotificationService::getPublicKey();
        
        return response()->json([
            'public_key' => $publicKey,
            'supported' => !empty($publicKey),
        ]);
    }

    /**
     * Subscribe to push notifications
     */
    public function subscribe(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $validator = Validator::make($request->all(), [
                'subscription' => 'required|array',
                'subscription.endpoint' => 'required|string|max:500',
                'subscription.keys' => 'required|array',
                'subscription.keys.p256dh' => 'required|string',
                'subscription.keys.auth' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $userAgent = $request->header('User-Agent');
            $subscription = $request->input('subscription');

            $success = PushNotificationService::subscribe($user->id, $subscription, $userAgent);

            if ($success) {
                return response()->json([
                    'message' => 'Push notification subscription activated',
                    'subscribed' => true,
                ]);
            }

            return response()->json(['error' => 'Failed to subscribe'], 500);
        } catch (\Exception $e) {
            Log::error('Push subscribe error: ' . $e->getMessage());
            return response()->json(['error' => 'Server error'], 500);
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    public function unsubscribe(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $validator = Validator::make($request->all(), [
                'endpoint' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $success = PushNotificationService::unsubscribe($request->input('endpoint'));

            return response()->json([
                'message' => $success ? 'Unsubscribed successfully' : 'Subscription not found',
                'unsubscribed' => $success,
            ]);
        } catch (\Exception $e) {
            Log::error('Push unsubscribe error: ' . $e->getMessage());
            return response()->json(['error' => 'Server error'], 500);
        }
    }

    /**
     * Get push notification status for current user
     */
    public function getStatus(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $hasSubscription = PushNotificationService::hasSubscription($user->id);
            $subscriptionCount = PushNotificationService::getSubscriptionCount($user->id);

            return response()->json([
                'subscribed' => $hasSubscription,
                'subscription_count' => $subscriptionCount,
            ]);
        } catch (\Exception $e) {
            Log::error('Push status error: ' . $e->getMessage());
            return response()->json(['error' => 'Server error'], 500);
        }
    }

    /**
     * Get pending push notifications (for polling fallback)
     */
    public function getPending(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            $notifications = PushNotificationService::getPendingNotifications($user->id);

            return response()->json($notifications);
        } catch (\Exception $e) {
            return response()->json([]);
        }
    }

    /**
     * Test push notification (for testing purposes)
     */
    public function sendTest(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $sent = PushNotificationService::sendToUser(
                $user->id,
                'Test Notification',
                'This is a test push notification from PlanTim',
                null,
                '/dashboard'
            );

            return response()->json([
                'message' => $sent > 0 ? 'Test notification sent' : 'No active subscriptions',
                'sent_count' => $sent,
            ]);
        } catch (\Exception $e) {
            Log::error('Push test error: ' . $e->getMessage());
            return response()->json(['error' => 'Server error'], 500);
        }
    }
}


