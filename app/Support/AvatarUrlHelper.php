<?php

namespace App\Support;

class AvatarUrlHelper
{
    /**
     * Same-origin relative avatar URL (works behind Vite HTTPS proxy).
     * Host-independent HMAC so signature is not tied to 127.0.0.1 vs LAN IP.
     */
    public static function signedUrl(int $userId, ?string $version = null): ?string
    {
        $expires = now()->addHours(6)->getTimestamp();
        $version = $version ?: '';
        $signature = self::signature($userId, $version, $expires);

        $query = http_build_query(array_filter([
            'expires' => $expires,
            'v' => $version !== '' ? $version : null,
            'sig' => $signature,
        ], static fn ($value) => $value !== null && $value !== ''));

        return '/api/profile/avatar/'.$userId.'?'.$query;
    }

    public static function versionFromPath(?string $avatarPath): ?string
    {
        if (! $avatarPath) {
            return null;
        }

        return substr(sha1($avatarPath), 0, 12);
    }

    public static function isValid(int $userId, ?string $version, $expires, ?string $signature): bool
    {
        if (! $signature || ! $expires || (int) $expires < time()) {
            return false;
        }

        $expected = self::signature($userId, $version ?: '', (int) $expires);

        return hash_equals($expected, $signature);
    }

    private static function signature(int $userId, string $version, int $expires): string
    {
        return hash_hmac(
            'sha256',
            $userId.'|'.$version.'|'.$expires,
            (string) config('app.key')
        );
    }
}
