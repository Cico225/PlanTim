<?php

namespace App\Console\Commands;

use App\Models\AppVersion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class UpdateAppVersion extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:version 
                            {version : Version number (e.g., 1.0.0)}
                            {--name= : Version name (e.g., "Feature Update")}
                            {--notes= : Release notes}
                            {--changelog= : JSON array of changes}
                            {--active : Set as active version}
                            {--latest : Set as latest version}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update application version';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $versionNumber = $this->argument('version');
        $versionName = $this->option('name');
        $releaseNotes = $this->option('notes');
        $changelog = $this->option('changelog');
        $isActive = $this->option('active');
        $isLatest = $this->option('latest');

        // Validate version format (semantic versioning)
        if (!preg_match('/^\d+\.\d+\.\d+$/', $versionNumber)) {
            $this->error('Version must be in format: X.Y.Z (e.g., 1.0.0)');
            return 1;
        }

        // Parse changelog if provided
        $changelogArray = null;
        if ($changelog) {
            $changelogArray = json_decode($changelog, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->error('Invalid JSON format for changelog');
                return 1;
            }
        }

        // If setting as active, deactivate all other versions
        if ($isActive) {
            AppVersion::where('is_active', true)->update(['is_active' => false]);
        }

        // If setting as latest, unset all other latest versions
        if ($isLatest) {
            AppVersion::where('is_latest', true)->update(['is_latest' => false]);
        }

        // Check if version already exists
        $version = AppVersion::where('version', $versionNumber)->first();

        if ($version) {
            // Update existing version
            $version->update([
                'version_name' => $versionName ?? $version->version_name,
                'release_notes' => $releaseNotes ?? $version->release_notes,
                'changelog' => $changelogArray ?? $version->changelog,
                'is_active' => $isActive !== null ? $isActive : $version->is_active,
                'is_latest' => $isLatest !== null ? $isLatest : $version->is_latest,
                'released_at' => $version->released_at ?? now(),
            ]);

            $this->info("Version {$versionNumber} updated successfully!");
        } else {
            // Create new version
            $version = AppVersion::create([
                'version' => $versionNumber,
                'version_name' => $versionName,
                'release_notes' => $releaseNotes,
                'changelog' => $changelogArray,
                'is_active' => $isActive ?? false,
                'is_latest' => $isLatest ?? false,
                'released_at' => now(),
            ]);

            $this->info("Version {$versionNumber} created successfully!");
        }

        // Update package.json if it exists
        $packageJsonPath = base_path('frontend/package.json');
        if (File::exists($packageJsonPath)) {
            $packageJson = json_decode(File::get($packageJsonPath), true);
            $packageJson['version'] = $versionNumber;
            File::put($packageJsonPath, json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
            $this->info("Updated frontend/package.json to version {$versionNumber}");
        }

        // Display version info
        $this->newLine();
        $this->info("Version Information:");
        $this->line("  Version: {$version->version}");
        if ($version->version_name) {
            $this->line("  Name: {$version->version_name}");
        }
        $this->line("  Active: " . ($version->is_active ? 'Yes' : 'No'));
        $this->line("  Latest: " . ($version->is_latest ? 'Yes' : 'No'));
        $this->line("  Released: {$version->released_at->format('Y-m-d H:i:s')}");

        return 0;
    }
}
