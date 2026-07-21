<?php
/**
 * PlanTim — backup baze (cita kredencijale iz .env)
 * Upotreba: php scripts/backup-database.php
 */

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$envFile = $rootDir . DIRECTORY_SEPARATOR . '.env';
$backupDir = $rootDir . DIRECTORY_SEPARATOR . 'backups';
$mysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';

function loadEnv(string $path): array
{
    if (!is_file($path)) {
        fwrite(STDERR, "GRESKA: .env nije pronadjen.\n");
        exit(1);
    }

    $vars = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        $vars[$key] = $value;
    }

    return $vars;
}

function fail(string $message): void
{
    fwrite(STDERR, 'GRESKA: ' . $message . PHP_EOL);
    exit(1);
}

$env = loadEnv($envFile);

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = $env['DB_PORT'] ?? '3306';
$database = $env['DB_DATABASE'] ?? fail('DB_DATABASE nije u .env');
$username = $env['DB_USERNAME'] ?? 'root';
$password = $env['DB_PASSWORD'] ?? '';

if (!is_file($mysqldump)) {
    fail('mysqldump nije pronadjen: ' . $mysqldump);
}

if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true) && !is_dir($backupDir)) {
    fail('Nije moguce kreirati folder backups/');
}

$timestamp = date('Ymd_His');
$outputFile = $backupDir . DIRECTORY_SEPARATOR . 'backup_' . $timestamp . '.sql';

$args = [
    $mysqldump,
    '-h', $host,
    '-P', $port,
    '-u', $username,
    '--single-transaction',
    '--routines',
    '--triggers',
    $database,
];

if ($password !== '') {
    $args[] = '-p' . $password;
}

$descriptors = [
    0 => ['pipe', 'r'],
    1 => ['file', $outputFile, 'w'],
    2 => ['pipe', 'w'],
];

echo "Backup baze: {$database}\n";
echo "Izlaz: {$outputFile}\n";

$process = proc_open($args, $descriptors, $pipes);

if (!is_resource($process)) {
    fail('Nije moguce pokrenuti mysqldump.');
}

fclose($pipes[0]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$exitCode = proc_close($process);

if ($exitCode !== 0 || !is_file($outputFile) || filesize($outputFile) === 0) {
    $detail = trim($stderr) !== '' ? trim($stderr) : 'Nepoznata greska mysqldump.';
    fail("mysqldump nije uspio (kod {$exitCode}): {$detail}");
}

$sizeMb = round(filesize($outputFile) / 1024 / 1024, 2);
echo "Backup uspjesan ({$sizeMb} MB).\n";
echo "Fajl: {$outputFile}\n";
