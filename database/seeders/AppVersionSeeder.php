<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AppVersion;
use Illuminate\Support\Facades\File;

class AppVersionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get version from package.json
        $packageJsonPath = base_path('frontend/package.json');
        $version = '1.0.0';
        
        if (File::exists($packageJsonPath)) {
            $packageJson = json_decode(File::get($packageJsonPath), true);
            $version = $packageJson['version'] ?? '1.0.0';
        }

        // Check if version already exists
        $existingVersion = AppVersion::where('version', $version)->first();
        
        if (!$existingVersion) {
            AppVersion::create([
                'version' => $version,
                'version_name' => 'Initial Release',
                'changelog' => [
                    'Initial release of PlanTim',
                ],
                'release_notes' => 'Welcome to PlanTim! This is the initial release.',
                'is_active' => true,
                'is_latest' => true,
                'released_at' => now(),
            ]);
            
            $this->command->info("Created initial version: {$version}");
        } else {
            $this->command->info("Version {$version} already exists");
        }
    }
}











