<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class PlanTimWindowsSchedulerService
{
    private const TASK_NAME = 'PlanTimBackupScheduler';

    /**
     * Pokušaj registrirati Windows zadatak (svake minute) — radi i kad niko ne koristi app.
     *
     * @return array{mode: string, message: string, task_registered: bool}
     */
    public function sync(bool $enabled): array
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            return [
                'mode' => 'internal',
                'message' => 'Interni PlanTim scheduler (aktivan dok je aplikacija u upotrebi).',
                'task_registered' => false,
            ];
        }

        if (! $enabled) {
            $this->deleteTask();

            return [
                'mode' => 'disabled',
                'message' => 'Automatski backup je isključen.',
                'task_registered' => false,
            ];
        }

        if ($this->registerTask()) {
            return [
                'mode' => 'windows_task',
                'message' => 'Windows zadatak je registriran — backup radi automatski 24/7.',
                'task_registered' => true,
            ];
        }

        return [
            'mode' => 'internal',
            'message' => 'PlanTim interni scheduler — backup se pokreće prema vremenu dok netko koristi aplikaciju (nije potreban ručni Task Scheduler).',
            'task_registered' => false,
        ];
    }

    public function isTaskRegistered(): bool
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            return false;
        }

        $output = [];
        $code = 1;
        @exec('schtasks /Query /TN "'.self::TASK_NAME.'" 2>nul', $output, $code);

        return $code === 0;
    }

    private function registerTask(): bool
    {
        $batPath = base_path('SCHEDULE_BACKUP.bat');
        if (! File::exists($batPath)) {
            Log::warning('SCHEDULE_BACKUP.bat not found, skipping Windows task registration');

            return false;
        }

        $this->deleteTask();

        $command = 'schtasks /Create /TN "'.self::TASK_NAME.'" /TR "\"'.$batPath.'\"" /SC MINUTE /MO 1 /F';
        $output = [];
        $code = 1;
        @exec($command.' 2>&1', $output, $code);

        if ($code !== 0) {
            Log::info('Windows Task Scheduler registration failed (using internal scheduler)', [
                'output' => implode("\n", $output),
                'code' => $code,
            ]);

            return false;
        }

        return true;
    }

    private function deleteTask(): void
    {
        @exec('schtasks /Delete /TN "'.self::TASK_NAME.'" /F 2>nul');
    }
}
