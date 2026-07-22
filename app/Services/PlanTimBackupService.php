<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use ZipArchive;

class PlanTimBackupService
{
    public const SETTINGS_KEYS = [
        'backup_auto_enabled',
        'backup_schedule_frequency',
        'backup_schedule_time',
        'backup_schedule_day',
        'backup_destination_path',
        'backup_notify_emails',
        'backup_keep_destination_count',
    ];

    private ?string $mysqldumpPath = null;

    public function getBackupDir(): string
    {
        $dir = base_path('backups');

        if (! File::exists($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        return $dir;
    }

    public function tableExists(): bool
    {
        return \Illuminate\Support\Facades\Schema::hasTable('plantim_backup_runs');
    }

    /**
     * @return array<string, mixed>
     */
    public function getSettings(): array
    {
        $defaults = [
            'backup_auto_enabled' => '0',
            'backup_schedule_frequency' => 'daily',
            'backup_schedule_time' => '02:00',
            'backup_schedule_day' => '1',
            'backup_destination_path' => '',
            'backup_notify_emails' => '',
            'backup_keep_destination_count' => '10',
        ];

        if (! \Illuminate\Support\Facades\Schema::hasTable('system_settings')) {
            return $this->formatSettings($defaults);
        }

        $rows = DB::table('system_settings')
            ->whereIn('key', self::SETTINGS_KEYS)
            ->pluck('value', 'key')
            ->all();

        return $this->formatSettings(array_merge($defaults, $rows));
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function saveSettings(array $input): array
    {
        $frequency = in_array($input['schedule_frequency'] ?? 'daily', ['hourly', 'daily', 'weekly'], true)
            ? $input['schedule_frequency']
            : 'daily';

        $time = $this->normalizeTime((string) ($input['schedule_time'] ?? '02:00'));
        $day = max(0, min(6, (int) ($input['schedule_day'] ?? 1)));
        $destination = trim(str_replace('/', DIRECTORY_SEPARATOR, (string) ($input['destination_path'] ?? '')));
        $emails = trim((string) ($input['notify_emails'] ?? ''));
        $keepCount = max(1, min(100, (int) ($input['keep_destination_count'] ?? 10)));
        $enabled = ! empty($input['auto_enabled']) ? '1' : '0';

        if ($enabled === '1' && $destination === '') {
            throw new \InvalidArgumentException('Odredišna lokacija je obavezna kada je automatski backup uključen.');
        }

        if ($destination !== '') {
            $this->assertDestinationWritable($destination);
        }

        $values = [
            'backup_auto_enabled' => $enabled,
            'backup_schedule_frequency' => $frequency,
            'backup_schedule_time' => $time,
            'backup_schedule_day' => (string) $day,
            'backup_destination_path' => $destination,
            'backup_notify_emails' => $emails,
            'backup_keep_destination_count' => (string) $keepCount,
        ];

        foreach ($values as $key => $value) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value' => $value,
                    'type' => 'string',
                    'group' => 'backup',
                    'description' => $key,
                    'updated_at' => now(),
                    'created_at' => DB::raw('COALESCE(created_at, NOW())'),
                ]
            );
        }

        $schedulerInfo = app(PlanTimWindowsSchedulerService::class)->sync($enabled === '1');
        $settings = $this->formatSettings(array_merge(
            $this->getSettingsRaw(),
            $values
        ));
        $settings['scheduler'] = $schedulerInfo;

        return $settings;
    }

    /**
     * @return array<string, string>
     */
    private function getSettingsRaw(): array
    {
        $defaults = [
            'backup_auto_enabled' => '0',
            'backup_schedule_frequency' => 'daily',
            'backup_schedule_time' => '02:00',
            'backup_schedule_day' => '1',
            'backup_destination_path' => '',
            'backup_notify_emails' => '',
            'backup_keep_destination_count' => '10',
        ];

        if (! \Illuminate\Support\Facades\Schema::hasTable('system_settings')) {
            return $defaults;
        }

        return array_merge(
            $defaults,
            DB::table('system_settings')
                ->whereIn('key', self::SETTINGS_KEYS)
                ->pluck('value', 'key')
                ->all()
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function runFullBackup(string $trigger = 'manual', ?int $userId = null): array
    {
        if (! $this->tableExists()) {
            throw new \RuntimeException('Pokrenite SQL migracije (plantim_backup_runs).');
        }

        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        $settings = $this->getSettings();
        $destination = $settings['destination_path'];

        if ($destination === '') {
            throw new \InvalidArgumentException('Odredišna lokacija nije postavljena.');
        }

        $this->assertDestinationWritable($destination);

        $runId = DB::table('plantim_backup_runs')->insertGetId([
            'trigger_type' => $trigger,
            'status' => 'running',
            'destination_path' => $destination,
            'started_at' => now(),
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $dbFilename = null;
        $zipFilename = null;
        $dbSize = null;
        $zipSize = null;
        $finalZipPath = null;

        try {
            $db = $this->createDatabaseBackup();
            $dbFilename = $db['filename'];
            $dbSize = $db['size'];

            DB::table('plantim_backup_runs')->where('id', $runId)->update([
                'db_filename' => $dbFilename,
                'db_size' => $dbSize,
                'updated_at' => now(),
            ]);

            $archive = $this->createProjectArchive($dbFilename);
            $zipFilename = $archive['filename'];
            $zipSize = $archive['size'];

            $finalZipPath = $this->copyArchiveToDestination($archive['path'], $destination, $zipFilename);

            $this->cleanupDestinationBackups($destination, (int) $settings['keep_destination_count']);

            if (File::exists($archive['path'])) {
                File::delete($archive['path']);
            }

            $emailSent = $this->sendNotification([
                'status' => 'success',
                'trigger_type' => $trigger,
                'db_filename' => $dbFilename,
                'zip_filename' => $zipFilename,
                'destination_path' => $finalZipPath,
                'db_size_formatted' => $this->formatBytes((int) $dbSize),
                'zip_size_formatted' => $this->formatBytes((int) $zipSize),
                'completed_at' => now()->format('Y-m-d H:i:s'),
            ], $settings);

            DB::table('plantim_backup_runs')->where('id', $runId)->update([
                'status' => 'success',
                'zip_filename' => $zipFilename,
                'zip_size' => $zipSize,
                'email_sent' => $emailSent ? 1 : 0,
                'email_recipients' => $settings['notify_emails'],
                'completed_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'run_id' => $runId,
                'status' => 'success',
                'db_filename' => $dbFilename,
                'zip_filename' => $zipFilename,
                'destination_path' => $finalZipPath,
                'db_size' => $dbSize,
                'db_size_formatted' => $this->formatBytes((int) $dbSize),
                'zip_size' => $zipSize,
                'zip_size_formatted' => $this->formatBytes((int) $zipSize),
                'email_sent' => $emailSent,
            ];
        } catch (\Throwable $e) {
            Log::error('PlanTim full backup failed', [
                'run_id' => $runId,
                'error' => $e->getMessage(),
            ]);

            DB::table('plantim_backup_runs')->where('id', $runId)->update([
                'status' => 'failed',
                'db_filename' => $dbFilename,
                'zip_filename' => $zipFilename,
                'zip_size' => $zipSize,
                'db_size' => $dbSize,
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
                'updated_at' => now(),
            ]);

            try {
                $this->sendNotification([
                    'status' => 'failed',
                    'trigger_type' => $trigger,
                    'db_filename' => $dbFilename,
                    'zip_filename' => $zipFilename,
                    'destination_path' => $finalZipPath ?? $destination,
                    'error_message' => $e->getMessage(),
                    'completed_at' => now()->format('Y-m-d H:i:s'),
                ], $settings);
            } catch (\Throwable $mailError) {
                Log::warning('Backup failure notification email failed: '.$mailError->getMessage());
            }

            throw $e;
        }
    }

    /**
     * @return array{filename: string, path: string, size: int}
     */
    public function createDatabaseBackup(): array
    {
        $mysqldump = $this->detectMysqldumpPath();
        if (! $mysqldump) {
            throw new \RuntimeException('mysqldump nije pronađen. Provjerite XAMPP MySQL instalaciju.');
        }

        $dbConfig = $this->getDbConfig();
        $timestamp = date('Y-m-d_H-i-s');
        $filename = "backup_{$timestamp}.sql";
        $filepath = $this->getBackupDir().DIRECTORY_SEPARATOR.$filename;

        $commandArgs = [
            '-h'.$dbConfig['host'],
            '-P'.$dbConfig['port'],
            '-u'.$dbConfig['username'],
        ];

        if (! empty($dbConfig['password'])) {
            $commandArgs[] = '--password='.$dbConfig['password'];
        } else {
            $commandArgs[] = '--password=';
        }

        $commandArgs = array_merge($commandArgs, [
            $dbConfig['database'],
            '--single-transaction',
            '--routines',
            '--triggers',
            '--quick',
            '--lock-tables=false',
        ]);

        $errorLogPath = $filepath.'.error.log';
        $process = @proc_open(array_merge([$mysqldump], $commandArgs), [
            0 => ['pipe', 'r'],
            1 => ['file', $filepath, 'w'],
            2 => ['file', $errorLogPath, 'w'],
        ], $pipes);

        if (! is_resource($process)) {
            throw new \RuntimeException('Nije moguće pokrenuti mysqldump.');
        }

        if (isset($pipes[0])) {
            fclose($pipes[0]);
        }

        $returnCode = proc_close($process);

        if (File::exists($errorLogPath)) {
            $errorLog = trim((string) File::get($errorLogPath));
            if ($errorLog !== '') {
                Log::error('mysqldump stderr: '.$errorLog);
            }
            File::delete($errorLogPath);
        }

        if ($returnCode !== 0 || ! File::exists($filepath) || File::size($filepath) === 0) {
            if (File::exists($filepath)) {
                File::delete($filepath);
            }
            throw new \RuntimeException('Backup baze nije uspio (kod '.$returnCode.').');
        }

        $this->assertValidSqlDump($filepath);

        return [
            'filename' => $filename,
            'path' => $filepath,
            'size' => File::size($filepath),
        ];
    }

    /**
     * @return array{filename: string, path: string, size: int}
     */
    public function createProjectArchive(string $sqlFilename): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException('PHP ZipArchive ekstenzija nije uključena.');
        }

        $timestamp = date('Y-m-d_H-i-s');
        $filename = "plantim_full_{$timestamp}.zip";
        $zipPath = $this->getBackupDir().DIRECTORY_SEPARATOR.$filename;
        $root = base_path();
        $rootLen = strlen($root) + 1;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Nije moguće kreirati ZIP arhivu.');
        }

        $excludePathPatterns = [
            '#[\\\\/]node_modules[\\\\/]#',
            '#[\\\\/]\\.git[\\\\/]#',
            '#[\\\\/]backups[\\\\/][^\\\\/]+\\.zip$#',
        ];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $fileInfo) {
            /** @var \SplFileInfo $fileInfo */
            $path = $fileInfo->getPathname();

            if ($path === $zipPath) {
                continue;
            }

            $normalized = str_replace('\\', '/', $path);
            $skip = false;
            foreach ($excludePathPatterns as $pattern) {
                if (preg_match($pattern, $normalized)) {
                    $skip = true;
                    break;
                }
            }
            if ($skip) {
                continue;
            }

            $relative = str_replace('\\', '/', substr($path, $rootLen));

            if ($fileInfo->isDir()) {
                $zip->addEmptyDir($relative);
            } else {
                $zip->addFile($path, $relative);
            }
        }

        $zip->close();

        if (! File::exists($zipPath) || File::size($zipPath) === 0) {
            if (File::exists($zipPath)) {
                File::delete($zipPath);
            }
            throw new \RuntimeException('ZIP arhiva projekta je prazna ili nije kreirana.');
        }

        return [
            'filename' => $filename,
            'path' => $zipPath,
            'size' => File::size($zipPath),
        ];
    }

    public function copyArchiveToDestination(string $zipPath, string $destination, string $filename): string
    {
        $destination = rtrim(str_replace('/', DIRECTORY_SEPARATOR, $destination), DIRECTORY_SEPARATOR);
        $target = $destination.DIRECTORY_SEPARATOR.$filename;

        if (! @copy($zipPath, $target)) {
            throw new \RuntimeException('Kopiranje ZIP arhive na odredište nije uspjelo: '.$target);
        }

        return $target;
    }

    public function assertDestinationWritable(string $destination): void
    {
        $destination = rtrim(str_replace('/', DIRECTORY_SEPARATOR, trim($destination)), DIRECTORY_SEPARATOR);

        if ($destination === '') {
            throw new \InvalidArgumentException('Odredišna lokacija je prazna.');
        }

        if (! File::exists($destination)) {
            if (! @mkdir($destination, 0755, true) && ! File::exists($destination)) {
                throw new \InvalidArgumentException('Nije moguće kreirati odredišni folder: '.$destination);
            }
        }

        if (! File::isDirectory($destination) || ! File::isWritable($destination)) {
            throw new \InvalidArgumentException('Odredišni folder nije dostupan za pisanje: '.$destination);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listRuns(int $limit = 50): array
    {
        if (! $this->tableExists()) {
            return [];
        }

        return DB::table('plantim_backup_runs')
            ->orderByDesc('started_at')
            ->limit($limit)
            ->get()
            ->map(function ($run) {
                return [
                    'id' => $run->id,
                    'trigger_type' => $run->trigger_type,
                    'status' => $run->status,
                    'db_filename' => $run->db_filename,
                    'zip_filename' => $run->zip_filename,
                    'destination_path' => $run->destination_path,
                    'db_size' => $run->db_size,
                    'db_size_formatted' => $run->db_size ? $this->formatBytes((int) $run->db_size) : null,
                    'zip_size' => $run->zip_size,
                    'zip_size_formatted' => $run->zip_size ? $this->formatBytes((int) $run->zip_size) : null,
                    'error_message' => $run->error_message,
                    'email_sent' => (bool) $run->email_sent,
                    'email_recipients' => $run->email_recipients,
                    'started_at' => $run->started_at,
                    'completed_at' => $run->completed_at,
                ];
            })
            ->all();
    }

    /**
     * @param  array<string, mixed>  $run
     * @param  array<string, mixed>  $settings
     */
    public function sendNotification(array $run, array $settings): bool
    {
        $recipients = $this->parseEmails((string) ($settings['notify_emails'] ?? ''));
        if ($recipients === []) {
            return false;
        }

        $subject = $run['status'] === 'success'
            ? '[PlanTim] Backup uspješno završen'
            : '[PlanTim] Backup nije uspio';

        Mail::send('emails.backup-completed', ['run' => $run], function ($message) use ($recipients, $subject) {
            $message->to($recipients)
                ->subject($subject);
        });

        return true;
    }

    private function cleanupDestinationBackups(string $destination, int $keepCount): void
    {
        $destination = rtrim(str_replace('/', DIRECTORY_SEPARATOR, $destination), DIRECTORY_SEPARATOR);
        if (! File::isDirectory($destination)) {
            return;
        }

        $files = collect(File::files($destination))
            ->filter(fn ($file) => str_starts_with($file->getFilename(), 'plantim_full_') && $file->getExtension() === 'zip')
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->values();

        if ($files->count() <= $keepCount) {
            return;
        }

        foreach ($files->slice($keepCount) as $oldFile) {
            File::delete($oldFile->getPathname());
        }
    }

    /**
     * @param  array<string, string>  $raw
     * @return array<string, mixed>
     */
    private function formatSettings(array $raw): array
    {
        $autoEnabled = ($raw['backup_auto_enabled'] ?? '0') === '1';
        $scheduler = app(PlanTimWindowsSchedulerService::class);

        if (! $autoEnabled) {
            $schedulerInfo = [
                'mode' => 'disabled',
                'message' => 'Automatski backup je isključen.',
                'task_registered' => false,
            ];
        } elseif ($scheduler->isTaskRegistered()) {
            $schedulerInfo = [
                'mode' => 'windows_task',
                'message' => 'Windows zadatak aktivan — backup radi automatski 24/7.',
                'task_registered' => true,
            ];
        } else {
            $schedulerInfo = [
                'mode' => 'internal',
                'message' => 'PlanTim interni scheduler — dovoljno je postaviti vrijeme ovdje. Backup se pokreće u zakazano vrijeme dok aplikacija radi (ručni Task Scheduler nije potreban).',
                'task_registered' => false,
            ];
        }

        $lastRun = null;
        if ($this->tableExists()) {
            $lastRun = DB::table('plantim_backup_runs')
                ->orderByDesc('started_at')
                ->first();
        }

        return [
            'auto_enabled' => $autoEnabled,
            'schedule_frequency' => $raw['backup_schedule_frequency'] ?? 'daily',
            'schedule_time' => $raw['backup_schedule_time'] ?? '02:00',
            'schedule_day' => (int) ($raw['backup_schedule_day'] ?? 1),
            'destination_path' => $raw['backup_destination_path'] ?? '',
            'notify_emails' => $raw['backup_notify_emails'] ?? '',
            'keep_destination_count' => (int) ($raw['backup_keep_destination_count'] ?? 10),
            'scheduler' => $schedulerInfo,
            'last_run' => $lastRun ? [
                'id' => $lastRun->id,
                'status' => $lastRun->status,
                'trigger_type' => $lastRun->trigger_type,
                'started_at' => $lastRun->started_at,
                'completed_at' => $lastRun->completed_at,
                'zip_filename' => $lastRun->zip_filename,
                'destination_path' => $lastRun->destination_path,
                'error_message' => $lastRun->error_message,
            ] : null,
        ];
    }

    private function normalizeTime(string $time): string
    {
        if (preg_match('/^(\d{1,2}):(\d{2})$/', trim($time), $m)) {
            $hour = max(0, min(23, (int) $m[1]));
            $minute = max(0, min(59, (int) $m[2]));

            return sprintf('%02d:%02d', $hour, $minute);
        }

        return '02:00';
    }

    /**
     * @return array{host: mixed, port: mixed, database: mixed, username: mixed, password: mixed}
     */
    private function getDbConfig(): array
    {
        $config = config('database.connections.mysql');

        return [
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'username' => $config['username'],
            'password' => $config['password'],
        ];
    }

    private function detectMysqldumpPath(): ?string
    {
        if ($this->mysqldumpPath) {
            return $this->mysqldumpPath;
        }

        $paths = [
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\Program Files\\xampp\\mysql\\bin\\mysqldump.exe',
            'mysqldump.exe',
            'mysqldump',
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return $this->mysqldumpPath = $path;
            }
        }

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $which = shell_exec('where mysqldump.exe 2>nul');
            if ($which) {
                $path = trim(str_replace("\n", '', $which));
                if ($path !== '' && file_exists($path)) {
                    return $this->mysqldumpPath = $path;
                }
            }
        }

        return null;
    }

    private function assertValidSqlDump(string $filepath): void
    {
        $content = File::get($filepath);
        $firstChars = substr(trim($content), 0, 200);

        $errorPatterns = [
            '/Access denied/i',
            '/Unknown database/i',
            '/Can\'t connect to/i',
            '/ERROR \d{4}/i',
            '/mysqldump: error/i',
        ];

        foreach ($errorPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                File::delete($filepath);
                throw new \RuntimeException('Backup baze sadrži grešku umjesto SQL sadržaja.');
            }
        }

        if (
            stripos($firstChars, '-- MariaDB dump') === false
            && stripos($firstChars, '-- MySQL dump') === false
            && stripos($firstChars, '-- Dump') === false
        ) {
            if (stripos($content, 'error') !== false && strlen($content) < 500) {
                File::delete($filepath);
                throw new \RuntimeException('Backup baze nije validan SQL dump.');
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function parseEmails(string $raw): array
    {
        $parts = preg_split('/[,;\s]+/', $raw) ?: [];
        $valid = [];

        foreach ($parts as $part) {
            $email = trim($part);
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $valid[] = $email;
            }
        }

        return array_values(array_unique($valid));
    }

    public function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $value = max(0, $bytes);

        for ($i = 0; $value > 1024 && $i < count($units) - 1; $i++) {
            $value /= 1024;
        }

        return round($value, $precision).' '.$units[$i];
    }
}
