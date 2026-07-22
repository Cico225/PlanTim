<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasTable('system_settings')) {
                return;
            }

            $settings = \Illuminate\Support\Facades\DB::table('system_settings')
                ->whereIn('key', [
                    'backup_auto_enabled',
                    'backup_schedule_frequency',
                    'backup_schedule_time',
                    'backup_schedule_day',
                ])
                ->pluck('value', 'key');

            if (($settings['backup_auto_enabled'] ?? '0') !== '1') {
                return;
            }

            $time = $settings['backup_schedule_time'] ?? '02:00';
            $frequency = $settings['backup_schedule_frequency'] ?? 'daily';
            $day = (int) ($settings['backup_schedule_day'] ?? 1);

            $event = $schedule->command('plantim:backup')
                ->withoutOverlapping(120)
                ->runInBackground()
                ->appendOutputTo(storage_path('logs/backup-scheduler.log'));

            match ($frequency) {
                'hourly' => $event->hourly(),
                'weekly' => $event->weeklyOn(max(0, min(6, $day)), $time),
                default => $event->dailyAt($time),
            };
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Backup schedule not loaded: '.$e->getMessage());
        }
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}










