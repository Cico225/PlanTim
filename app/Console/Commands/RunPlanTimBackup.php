<?php

namespace App\Console\Commands;

use App\Services\PlanTimBackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunPlanTimBackup extends Command
{
    protected $signature = 'plantim:backup {--manual : Označava ručno pokretanje}';

    protected $description = 'Puni backup PlanTim-a: baza u backups/ + ZIP projekta na odredišnu lokaciju';

    public function handle(PlanTimBackupService $backupService): int
    {
        $settings = $backupService->getSettings();

        if (($settings['destination_path'] ?? '') === '') {
            $this->error('Odredišna lokacija backupa nije postavljena.');
            return self::FAILURE;
        }

        if (! $this->option('manual') && ! ($settings['auto_enabled'] ?? false)) {
            $this->info('Automatski backup je isključen.');
            return self::SUCCESS;
        }

        $trigger = $this->option('manual') ? 'manual' : 'scheduled';

        try {
            $result = $backupService->runFullBackup($trigger);
            $this->info('Backup uspješan: '.$result['zip_filename']);
            $this->info('Odredište: '.$result['destination_path']);
            return self::SUCCESS;
        } catch (\Throwable $e) {
            Log::error('plantim:backup command failed', ['error' => $e->getMessage()]);
            $this->error('Backup nije uspio: '.$e->getMessage());
            return self::FAILURE;
        }
    }
}
