<?php
/**
 * PlanTim — provjera MySQL kredencijala iz .env
 * Upotreba: php scripts/check-mysql.php
 */

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$envFile = $rootDir . DIRECTORY_SEPARATOR . '.env';

function loadEnv(string $path): array
{
    if (!is_file($path)) {
        fwrite(STDERR, "GRESKA: .env nije pronadjen: {$path}\n");
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

function maskPassword(string $password): string
{
    if ($password === '') {
        return '(prazno)';
    }
    return str_repeat('*', min(strlen($password), 8));
}

$env = loadEnv($envFile);

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = $env['DB_PORT'] ?? '3306';
$database = $env['DB_DATABASE'] ?? '';
$username = $env['DB_USERNAME'] ?? 'root';
$password = $env['DB_PASSWORD'] ?? '';

echo "PlanTim — provjera MySQL kredencijala\n";
echo str_repeat('=', 40) . "\n";
echo "Izvor:     .env\n";
echo "DB_HOST:     {$host}\n";
echo "DB_PORT:     {$port}\n";
echo "DB_DATABASE: " . ($database !== '' ? $database : '(NIJE POSTAVLJENO)') . "\n";
echo "DB_USERNAME: {$username}\n";
echo "DB_PASSWORD: " . maskPassword($password) . "\n";
echo str_repeat('-', 40) . "\n";

if ($database === '') {
    fwrite(STDERR, "GRESKA: DB_DATABASE nije definisan u .env\n");
    exit(1);
}

$mysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
if (!is_file($mysqldump)) {
    $mysqldump = 'mysqldump';
}

echo "Test 1: PDO konekcija...\n";

try {
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $version = $pdo->query('SELECT VERSION()')->fetchColumn();
    echo "  OK — MySQL {$version}\n";
} catch (PDOException $e) {
    fwrite(STDERR, "  GRESKA — " . $e->getMessage() . "\n");
    echo "\nUobicajeni uzroci:\n";
    echo "  - MySQL nije pokrenut u XAMPP Control Panelu\n";
    echo "  - Pogresan DB_DATABASE, DB_USERNAME ili DB_PASSWORD u .env\n";
    echo "  - Baza '{$database}' ne postoji\n";
    exit(1);
}

echo "Test 2: mysqldump putanja...\n";
if (is_file($mysqldump) || $mysqldump === 'mysqldump') {
    echo "  OK — {$mysqldump}\n";
} else {
    fwrite(STDERR, "  GRESKA — mysqldump nije pronadjen: {$mysqldump}\n");
    exit(1);
}

echo "\nSve provjere prosle. Backup bi trebao raditi.\n";
