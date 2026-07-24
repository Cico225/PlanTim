<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class AppVersionController extends Controller
{
    /**
     * Get current application version
     */
    public function getCurrent(Request $request)
    {
        try {
            // Check if table exists
            if (!Schema::hasTable('app_versions')) {
                $version = $this->getVersionFromPackage();
                return response()->json([
                    'version' => $version,
                    'version_name' => null,
                    'released_at' => null,
                    'changelog' => null,
                    'release_notes' => null,
                ]);
            }

            $currentVersion = AppVersion::current();
            
            // If no version in database, try to get from package.json
            if (!$currentVersion) {
                $version = $this->getVersionFromPackage();
                return response()->json([
                    'version' => $version,
                    'version_name' => null,
                    'released_at' => null,
                    'changelog' => null,
                    'release_notes' => null,
                ]);
            }

            return response()->json([
                'version' => $currentVersion->version,
                'version_name' => $currentVersion->version_name,
                'released_at' => $currentVersion->released_at ? $currentVersion->released_at->toIso8601String() : null,
                'changelog' => $currentVersion->changelog,
                'release_notes' => $currentVersion->release_notes,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getCurrent error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Fallback to package.json on error
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
            // Check if table exists
            if (!Schema::hasTable('app_versions')) {
                $version = $this->getVersionFromPackage();
                return response()->json([
                    'version' => $version,
                    'is_update_available' => false,
                    'current_version' => $version,
                ]);
            }

            $latestVersion = AppVersion::getLatest();
            
            if (!$latestVersion) {
                $currentVersion = AppVersion::current();
                if ($currentVersion) {
                    return response()->json([
                        'version' => $currentVersion->version,
                        'version_name' => $currentVersion->version_name,
                        'released_at' => $currentVersion->released_at ? $currentVersion->released_at->toIso8601String() : null,
                        'is_update_available' => false,
                        'current_version' => $currentVersion->version,
                    ]);
                }
                
                // Fallback to package.json
                $version = $this->getVersionFromPackage();
                return response()->json([
                    'version' => $version,
                    'is_update_available' => false,
                    'current_version' => $version,
                ]);
            }

            $currentVersion = AppVersion::current();
            $currentVersionNumber = $currentVersion ? $currentVersion->version : $this->getVersionFromPackage();
            
            return response()->json([
                'version' => $latestVersion->version,
                'version_name' => $latestVersion->version_name,
                'released_at' => $latestVersion->released_at ? $latestVersion->released_at->toIso8601String() : null,
                'changelog' => $latestVersion->changelog,
                'release_notes' => $latestVersion->release_notes,
                'is_update_available' => version_compare($latestVersion->version, $currentVersionNumber, '>'),
                'current_version' => $currentVersionNumber,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getLatest error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Fallback to package.json on error
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
            if (!Schema::hasTable('app_versions')) {
                $version = $this->getVersionFromPackage();
                return response()->json([
                    [
                        'version' => $version,
                        'version_name' => null,
                        'released_at' => null,
                        'changelog' => null,
                        'release_notes' => null,
                    ],
                ]);
            }

            $versions = AppVersion::query()
                ->orderByDesc('released_at')
                ->orderByDesc('id')
                ->limit(12)
                ->get();

            if ($versions->isEmpty()) {
                $version = $this->getVersionFromPackage();
                return response()->json([
                    [
                        'version' => $version,
                        'version_name' => null,
                        'released_at' => null,
                        'changelog' => null,
                        'release_notes' => null,
                    ],
                ]);
            }

            return response()->json($versions->map(function (AppVersion $entry) {
                return [
                    'id' => $entry->id,
                    'version' => $entry->version,
                    'version_name' => $entry->version_name,
                    'released_at' => $entry->released_at ? $entry->released_at->toIso8601String() : null,
                    'changelog' => $entry->changelog,
                    'release_notes' => $entry->release_notes,
                    'is_active' => $entry->is_active,
                    'is_latest' => $entry->is_latest,
                ];
            })->values());
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AppVersion getHistory error: ' . $e->getMessage());

            $version = $this->getVersionFromPackage();
            return response()->json([
                [
                    'version' => $version,
                    'version_name' => null,
                    'released_at' => null,
                    'changelog' => null,
                    'release_notes' => null,
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
        
        // Fallback to composer.json
        $composerJsonPath = base_path('composer.json');
        if (File::exists($composerJsonPath)) {
            $composerJson = json_decode(File::get($composerJsonPath), true);
            return $composerJson['version'] ?? '1.0.0';
        }
        
        return '1.0.0';
    }
}
