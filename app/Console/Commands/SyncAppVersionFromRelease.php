<?php

namespace App\Console\Commands;

use App\Services\AppReleaseService;
use Illuminate\Console\Command;

class SyncAppVersionFromRelease extends Command
{
    protected $signature = 'app:version-sync
                            {--file= : Path to release JSON (default: app/release.json)}
                            {--dry-run : Show changes without writing to database}';

    protected $description = 'Sync app version and changelog from app/release.json into the database';

    public function handle(AppReleaseService $releases): int
    {
        $releasePath = $this->option('file') ?: $releases->releaseFilePath();

        if (! is_file($releasePath)) {
            $this->error("Release file not found: {$releasePath}");
            $this->line('Run app:version-bump first or create app/release.json manually.');

            return 1;
        }

        $release = json_decode(file_get_contents($releasePath), true);
        if (! is_array($release) || json_last_error() !== JSON_ERROR_NONE) {
            $this->error('Invalid JSON in release file.');

            return 1;
        }

        $versionNumber = $release['version'] ?? null;
        $versionName = $release['version_name'] ?? null;
        $releaseNotes = $release['release_notes'] ?? null;
        $changelog = $release['changelog'] ?? null;

        $this->info("Release manifest: {$versionNumber}" . ($versionName ? " ({$versionName})" : ''));

        if ($this->option('dry-run')) {
            $this->warn('Dry run — no database changes.');
            $this->displayReleaseSummary($versionNumber, $versionName, $releaseNotes, is_array($changelog) ? $changelog : null);

            return 0;
        }

        try {
            $syncedVersion = $releases->syncToDatabase();
            $this->info("Synced version {$syncedVersion} to database.");
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return 1;
        }

        $this->displayReleaseSummary(
            is_string($versionNumber) ? $versionNumber : $syncedVersion,
            is_string($versionName) ? $versionName : null,
            is_string($releaseNotes) ? $releaseNotes : null,
            is_array($changelog) ? $changelog : null
        );

        return 0;
    }

    /**
     * @param  array<int, string>|null  $changelog
     */
    private function displayReleaseSummary(
        string $versionNumber,
        ?string $versionName,
        ?string $releaseNotes,
        ?array $changelog
    ): void {
        $this->newLine();
        $this->line("  Version: {$versionNumber}");
        if ($versionName) {
            $this->line("  Name: {$versionName}");
        }
        if ($releaseNotes) {
            $this->line("  Notes: {$releaseNotes}");
        }
        if ($changelog) {
            $this->line('  Changelog:');
            foreach ($changelog as $item) {
                $this->line("    - {$item}");
            }
        }
    }
}
