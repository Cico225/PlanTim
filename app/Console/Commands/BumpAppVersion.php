<?php

namespace App\Console\Commands;

use App\Services\AppReleaseService;
use Illuminate\Console\Command;

class BumpAppVersion extends Command
{
    protected $signature = 'app:version-bump
                            {--message= : Changelog entry for this release}
                            {--type=patch : Version bump type: patch, minor, or major}
                            {--sync : Sync the new version into the database}
                            {--dry-run : Show the next version without writing files}';

    protected $description = 'Automatically bump app version in app/release.json before deploy';

    public function handle(AppReleaseService $releases): int
    {
        $message = trim((string) ($this->option('message') ?: ''));
        if ($message === '') {
            $this->error('Option --message is required (commit description).');

            return 1;
        }

        $type = strtolower((string) $this->option('type'));
        if (! in_array($type, ['patch', 'minor', 'major'], true)) {
            $this->error('Option --type must be patch, minor, or major.');

            return 1;
        }

        $current = $releases->load();
        $previous = $current['version'] ?? ($releases->getEffectiveCurrent()['version'] ?? '1.0.0');
        $next = $releases->incrementVersion($previous, $type);

        $this->info("Next version: {$previous} -> {$next}");
        $this->line("  Changelog: {$message}");

        if ($this->option('dry-run')) {
            $this->warn('Dry run — release files were not changed.');

            return 0;
        }

        $result = $releases->bump($message, $type);
        $this->info("Updated app/release.json and frontend/package.json to {$result['current']}.");

        if ($this->option('sync')) {
            return $this->syncRelease($releases);
        }

        return 0;
    }

    private function syncRelease(AppReleaseService $releases): int
    {
        try {
            $version = $releases->syncToDatabase();
            $this->info("Synced version {$version} to database.");
        } catch (\Throwable $e) {
            $this->warn('Database sync skipped: ' . $e->getMessage());
            $this->line('Release files were updated; run php artisan app:version-sync when DB is ready.');
        }

        return 0;
    }
}
