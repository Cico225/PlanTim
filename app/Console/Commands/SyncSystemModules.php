<?php

namespace App\Console\Commands;

use App\Support\LmsModuleRegistry;
use App\Support\PlanikaModuleRegistry;
use Database\Seeders\SystemModulesSeeder;
use Illuminate\Console\Command;

class SyncSystemModules extends Command
{
    protected $signature = 'modules:sync
        {--planika-only : Sync only Planika submodule registry entries}
        {--lms-only : Sync only LMS submodule registry entries}';

    protected $description = 'Sync system_modules from seeders/registry (run after adding new submodules)';

    public function handle(): int
    {
        if ($this->option('planika-only')) {
            $count = PlanikaModuleRegistry::sync();
            $this->info("Synced {$count} Planika submodule(s) to system_modules.");

            return self::SUCCESS;
        }

        if ($this->option('lms-only')) {
            $count = LmsModuleRegistry::sync();
            $this->info("Synced {$count} LMS submodule(s) to system_modules.");

            return self::SUCCESS;
        }

        $this->call('db:seed', ['--class' => SystemModulesSeeder::class, '--force' => true]);
        $planikaCount = PlanikaModuleRegistry::sync();
        $lmsCount = LmsModuleRegistry::sync();
        $this->info("Synced base modules, {$planikaCount} Planika and {$lmsCount} LMS submodule(s).");

        return self::SUCCESS;
    }
}
