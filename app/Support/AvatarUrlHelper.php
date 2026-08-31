<?php

namespace App\Support;

use Illuminate\Support\Facades\URL;

class AvatarUrlHelper
{
    public static function signedUrl(int $userId): ?string
    {
        return URL::temporarySignedRoute(
            'api.profile.avatar',
            now()->addHours(6),
            ['userId' => $userId]
        );
    }
}
