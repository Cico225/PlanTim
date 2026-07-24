<?php

namespace App\Services;

use App\Models\AppVersion;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class AppReleaseService
{
    public const RELEASE_PATH = 'app/release.json';

    public const PACKAGE_PATH = 'frontend/package.json';

    public const MAX_CHANGELOG_ITEMS = 20;

    public function releaseFilePath(): string
    {
        return base_path(self::RELEASE_PATH);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function load(): ?array
    {
        $path = $this->releaseFilePath();
        if (! File::exists($path)) {
            return null;
        }

        $data = json_decode(File::get($path), true);
        if (! is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        if (! $this->isValidVersion($data['version'] ?? null)) {
            return null;
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $release
     */
    public function save(array $release): void
    {
        if (! $this->isValidVersion($release['version'] ?? null)) {
            throw new \InvalidArgumentException('Release version must be in X.Y.Z format.');
        }

        File::put(
            $this->releaseFilePath(),
            json_encode($release, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n"
        );

        $this->syncPackageJson($release['version']);
    }

    /**
     * @return array{previous: string, current: string, release: array<string, mixed>}
     */
    public function bump(string $message, string $type = 'patch'): array
    {
        $message = trim($message);
        if ($message === '') {
            throw new \InvalidArgumentException('Release message is required.');
        }

        $release = $this->load() ?? [
            'version' => $this->getVersionFromPackage() ?? '1.0.0',
            'version_name' => 'PlanTim',
            'release_notes' => '',
            'changelog' => [],
        ];

        $previous = $release['version'];
        $next = $this->incrementVersion($previous, $type);

        $changelog = is_array($release['changelog'] ?? null) ? $release['changelog'] : [];
        array_unshift($changelog, $message);
        $changelog = array_values(array_unique($changelog));
        $changelog = array_slice($changelog, 0, self::MAX_CHANGELOG_ITEMS);

        $release = [
            'version' => $next,
            'version_name' => 'Release ' . now()->format('Y-m-d'),
            'release_notes' => $message,
            'changelog' => $changelog,
        ];

        $this->save($release);

        return [
            'previous' => $previous,
            'current' => $next,
            'release' => $release,
        ];
    }

    /**
     * @return array{version: string, version_name: ?string, release_notes: ?string, changelog: ?array<int, string>, released_at: ?string, source: string}
     */
    public function getEffectiveCurrent(): array
    {
        $fromFile = $this->load();
        $fromDb = Schema::hasTable('app_versions') ? AppVersion::current() : null;

        if ($fromFile && $fromDb) {
            if (version_compare($fromFile['version'], $fromDb->version, '>')) {
                return $this->formatReleasePayload($fromFile, 'release.json');
            }

            return $this->formatDbPayload($fromDb);
        }

        if ($fromFile) {
            return $this->formatReleasePayload($fromFile, 'release.json');
        }

        if ($fromDb) {
            return $this->formatDbPayload($fromDb);
        }

        $packageVersion = $this->getVersionFromPackage() ?? '1.0.0';

        return [
            'version' => $packageVersion,
            'version_name' => null,
            'release_notes' => null,
            'changelog' => null,
            'released_at' => null,
            'source' => 'package.json',
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getEffectiveHistory(int $limit = 12): array
    {
        $history = [];

        if (Schema::hasTable('app_versions')) {
            $history = AppVersion::query()
                ->orderByDesc('released_at')
                ->orderByDesc('id')
                ->limit($limit)
                ->get()
                ->map(fn (AppVersion $entry) => [
                    'id' => $entry->id,
                    'version' => $entry->version,
                    'version_name' => $entry->version_name,
                    'released_at' => $entry->released_at?->toIso8601String(),
                    'changelog' => $entry->changelog,
                    'release_notes' => $entry->release_notes,
                    'is_active' => $entry->is_active,
                    'is_latest' => $entry->is_latest,
                    'source' => 'database',
                ])
                ->all();
        }

        $fromFile = $this->load();
        if (! $fromFile) {
            return $history ?: [$this->getEffectiveCurrent()];
        }

        $fileVersion = $fromFile['version'];
        $alreadyListed = collect($history)->contains(fn ($item) => ($item['version'] ?? '') === $fileVersion);

        if (! $alreadyListed && version_compare($fileVersion, $history[0]['version'] ?? '0.0.0', '>')) {
            array_unshift($history, array_merge($this->formatReleasePayload($fromFile, 'release.json'), [
                'id' => null,
                'is_active' => true,
                'is_latest' => true,
            ]));
        }

        return array_slice($history, 0, $limit);
    }

    public function syncToDatabase(): string
    {
        $release = $this->load();
        if (! $release) {
            throw new \RuntimeException('Release file not found or invalid.');
        }

        $this->ensureTableExists();

        $versionNumber = $release['version'];
        $versionName = $release['version_name'] ?? null;
        $releaseNotes = $release['release_notes'] ?? null;
        $changelog = is_array($release['changelog'] ?? null) ? $release['changelog'] : null;

        AppVersion::where('is_active', true)->update(['is_active' => false]);
        AppVersion::where('is_latest', true)->update(['is_latest' => false]);

        $version = AppVersion::where('version', $versionNumber)->first();

        if ($version) {
            $version->update([
                'version_name' => $versionName ?? $version->version_name,
                'release_notes' => $releaseNotes ?? $version->release_notes,
                'changelog' => $changelog ?? $version->changelog,
                'is_active' => true,
                'is_latest' => true,
                'released_at' => $version->released_at ?? now(),
            ]);
        } else {
            AppVersion::create([
                'version' => $versionNumber,
                'version_name' => $versionName,
                'release_notes' => $releaseNotes,
                'changelog' => $changelog,
                'is_active' => true,
                'is_latest' => true,
                'released_at' => now(),
            ]);
        }

        $this->syncPackageJson($versionNumber);

        return $versionNumber;
    }

    public function incrementVersion(string $version, string $type = 'patch'): string
    {
        if (! $this->isValidVersion($version)) {
            throw new \InvalidArgumentException("Invalid version: {$version}");
        }

        [$major, $minor, $patch] = array_map('intval', explode('.', $version));

        return match ($type) {
            'major' => ($major + 1) . '.0.0',
            'minor' => $major . '.' . ($minor + 1) . '.0',
            default => $major . '.' . $minor . '.' . ($patch + 1),
        };
    }

    private function isValidVersion(mixed $version): bool
    {
        return is_string($version) && preg_match('/^\d+\.\d+\.\d+$/', $version) === 1;
    }

    private function getVersionFromPackage(): ?string
    {
        $path = base_path(self::PACKAGE_PATH);
        if (! File::exists($path)) {
            return null;
        }

        $packageJson = json_decode(File::get($path), true);
        $version = $packageJson['version'] ?? null;

        return $this->isValidVersion($version) ? $version : null;
    }

    private function syncPackageJson(string $versionNumber): void
    {
        $path = base_path(self::PACKAGE_PATH);
        if (! File::exists($path)) {
            return;
        }

        $packageJson = json_decode(File::get($path), true);
        if (! is_array($packageJson)) {
            return;
        }

        if (($packageJson['version'] ?? null) === $versionNumber) {
            return;
        }

        $packageJson['version'] = $versionNumber;
        File::put(
            $path,
            json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n"
        );
    }

    /**
     * @param  array<string, mixed>  $release
     * @return array{version: string, version_name: ?string, release_notes: ?string, changelog: ?array<int, string>, released_at: ?string, source: string}
     */
    private function formatReleasePayload(array $release, string $source): array
    {
        return [
            'version' => $release['version'],
            'version_name' => $release['version_name'] ?? null,
            'release_notes' => $release['release_notes'] ?? null,
            'changelog' => is_array($release['changelog'] ?? null) ? $release['changelog'] : null,
            'released_at' => now()->toIso8601String(),
            'source' => $source,
        ];
    }

    /**
     * @return array{version: string, version_name: ?string, release_notes: ?string, changelog: ?array<int, string>, released_at: ?string, source: string}
     */
    private function formatDbPayload(AppVersion $entry): array
    {
        return [
            'version' => $entry->version,
            'version_name' => $entry->version_name,
            'release_notes' => $entry->release_notes,
            'changelog' => $entry->changelog,
            'released_at' => $entry->released_at?->toIso8601String(),
            'source' => 'database',
        ];
    }

    private function ensureTableExists(): void
    {
        if (Schema::hasTable('app_versions')) {
            return;
        }

        Schema::create('app_versions', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20)->unique();
            $table->string('version_name')->nullable();
            $table->json('changelog')->nullable();
            $table->text('release_notes')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('is_latest')->default(false);
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->index('version');
            $table->index('is_active');
            $table->index('is_latest');
        });
    }
}
