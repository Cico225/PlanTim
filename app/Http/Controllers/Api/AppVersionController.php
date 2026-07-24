<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppVersion;
use App\Services\AppReleaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class AppVersionController extends Controller
{
    public function __construct(
        private AppReleaseService $releases
    ) {}

    /**
     * Get current application version
     */
    public function getCurrent(Request $request)
    {
        try {
            $current = $this->releases->getEffectiveCurrent();

            return response()->json([
                'version' => $current['version'],
                'version_name' => $current['version_name'],
                'released_at' => $current['released_at'],
                'changelog' => $current['changelog'],
                'release_notes' => $current['release_notes'],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getCurrent error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            $version = $this->getVersionFromPackage();

            return response()->json([
                'version' => $version,
                'version_name' => null,
                'released_at' => null,
                'changelog' => null,
                'release_notes' => null,
            ]);
        }
    }

    /**
     * Get latest version (for checking updates)
     */
    public function getLatest(Request $request)
    {
        try {
            $current = $this->releases->getEffectiveCurrent();
            $latestVersion = Schema::hasTable('app_versions') ? AppVersion::getLatest() : null;
            $latestNumber = $latestVersion?->version ?? $current['version'];

            if ($latestVersion && version_compare($current['version'], $latestVersion->version, '>')) {
                $latestNumber = $current['version'];
            }

            $isUpdateAvailable = version_compare($latestNumber, $current['version'], '>');

            return response()->json([
                'version' => $latestNumber,
                'version_name' => $current['version_name'],
                'released_at' => $current['released_at'],
                'changelog' => $current['changelog'],
                'release_notes' => $current['release_notes'],
                'is_update_available' => $isUpdateAvailable,
                'current_version' => $current['version'],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getLatest error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            $version = $this->getVersionFromPackage();

            return response()->json([
                'version' => $version,
                'is_update_available' => false,
                'current_version' => $version,
            ]);
        }
    }

    /**
     * Get version history for changelog modal
     */
    public function getHistory(Request $request)
    {
        try {
            $history = $this->releases->getEffectiveHistory();

            return response()->json(collect($history)->map(function (array $entry) {
                return [
                    'id' => $entry['id'] ?? null,
                    'version' => $entry['version'],
                    'version_name' => $entry['version_name'] ?? null,
                    'released_at' => $entry['released_at'] ?? null,
                    'changelog' => $entry['changelog'] ?? null,
                    'release_notes' => $entry['release_notes'] ?? null,
                    'is_active' => $entry['is_active'] ?? null,
                    'is_latest' => $entry['is_latest'] ?? null,
                ];
            })->values());
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getHistory error: ' . $e->getMessage());

            $current = $this->releases->getEffectiveCurrent();

            return response()->json([
                [
                    'version' => $current['version'],
                    'version_name' => $current['version_name'],
                    'released_at' => $current['released_at'],
                    'changelog' => $current['changelog'],
                    'release_notes' => $current['release_notes'],
                ],
            ]);
        }
    }

    /**
     * Get version from package.json
     */
    private function getVersionFromPackage(): string
    {
        $packageJsonPath = base_path('frontend/package.json');
        if (File::exists($packageJsonPath)) {
            $packageJson = json_decode(File::get($packageJsonPath), true);

            return $packageJson['version'] ?? '1.0.0';
        }

        $composerJsonPath = base_path('composer.json');
        if (File::exists($composerJsonPath)) {
            $composerJson = json_decode(File::get($composerJsonPath), true);

            return $composerJson['version'] ?? '1.0.0';
        }

        return '1.0.0';
    }
}
