<?php
/**
 * PlanTim SQL Migration Runner
 *
 * Automatski izvršava samo nove .sql fajlove iz database/migrations/sql/
 * Konfiguracija baze čita se iz .env fajla.
 *
 * Upotreba:
 *   php migrate.php
 *   php migrate.php --dry-run
 */

declare(strict_types=1);

$rootDir = __DIR__;
$envFile = $rootDir . DIRECTORY_SEPARATOR . '.env';
$sqlDir = $rootDir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'migrations' . DIRECTORY_SEPARATOR . 'sql';

$dryRun = in_array('--dry-run', $argv ?? [], true);

function writeln(string $message): void
{
    echo $message . PHP_EOL;
}

function fail(string $message, int $code = 1): void
{
    fwrite(STDERR, 'GRESKA: ' . $message . PHP_EOL);
    exit($code);
}

/**
 * @return array<string, string>
 */
function loadEnv(string $path): array
{
    if (!is_file($path)) {
        fail('.env fajl nije pronađen. Kopirajte .env.example u .env i popunite DB podatke.');
    }

    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES);

    if ($lines === false) {
        fail('Nije moguće pročitati .env fajl.');
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (!str_contains($line, '=')) {
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

function createPdo(array $env): PDO
{
    $host = $env['DB_HOST'] ?? '127.0.0.1';
    $port = $env['DB_PORT'] ?? '3306';
    $database = $env['DB_DATABASE'] ?? fail('DB_DATABASE nije definisan u .env');
    $username = $env['DB_USERNAME'] ?? 'root';
    $password = $env['DB_PASSWORD'] ?? '';

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

    try {
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
        ]);
    } catch (PDOException $e) {
        fail('Konekcija na bazu nije uspjela: ' . $e->getMessage());
    }

    return $pdo;
}

function ensureMigrationsTable(PDO $pdo): void
{
    $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

    $pdo->exec($sql);
}

/**
 * @return list<string>
 */
function getSqlMigrationFiles(string $directory): array
{
    if (!is_dir($directory)) {
        fail('Folder za SQL migracije ne postoji: ' . $directory);
    }

    $files = glob($directory . DIRECTORY_SEPARATOR . '*.sql') ?: [];

    $files = array_map(static fn (string $path): string => basename($path), $files);
    sort($files, SORT_STRING);

    return $files;
}

/**
 * @return array<string, bool>
 */
function getExecutedMigrations(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT migration FROM migrations');
    $rows = $stmt ? $stmt->fetchAll() : [];

    $executed = [];
    foreach ($rows as $row) {
        $executed[$row['migration']] = true;
    }

    return $executed;
}

function getNextBatch(PDO $pdo): int
{
    $stmt = $pdo->query('SELECT COALESCE(MAX(batch), 0) AS max_batch FROM migrations');
    $row = $stmt ? $stmt->fetch() : ['max_batch' => 0];

    return ((int) ($row['max_batch'] ?? 0)) + 1;
}

function executeSqlFile(PDO $pdo, string $filePath): void
{
    $sql = file_get_contents($filePath);

    if ($sql === false || trim($sql) === '') {
        fail('SQL fajl je prazan ili nečitljiv: ' . $filePath);
    }

    $pdo->exec($sql);
}

function recordMigration(PDO $pdo, string $filename, int $batch): void
{
    $stmt = $pdo->prepare('INSERT INTO migrations (migration, batch) VALUES (:migration, :batch)');
    $stmt->execute([
        'migration' => $filename,
        'batch' => $batch,
    ]);
}

// --- Main ---

writeln('PlanTim SQL migracije');
writeln('=====================');

$env = loadEnv($envFile);
$appEnv = $env['APP_ENV'] ?? 'local';

if ($appEnv === 'production') {
    writeln('Okruženje: PRODUKCIJA — migracije će se primijeniti na produkcijsku bazu.');
} else {
    writeln('Okruženje: ' . $appEnv);
}

$pdo = createPdo($env);
ensureMigrationsTable($pdo);

$allFiles = getSqlMigrationFiles($sqlDir);
$executed = getExecutedMigrations($pdo);

$pending = array_values(array_filter(
    $allFiles,
    static fn (string $file): bool => !isset($executed[$file])
));

if ($pending === []) {
    writeln('Nema novih migracija. Baza je ažurna.');
    exit(0);
}

writeln('Pronađeno novih migracija: ' . count($pending));

if ($dryRun) {
    writeln('');
    writeln('Dry-run — sljedeće migracije bi bile izvršene:');
    foreach ($pending as $file) {
        writeln('  - ' . $file);
    }
    exit(0);
}

$batch = getNextBatch($pdo);

foreach ($pending as $file) {
    $path = $sqlDir . DIRECTORY_SEPARATOR . $file;
    writeln('Pokrećem: ' . $file . ' (batch ' . $batch . ')');

    try {
        executeSqlFile($pdo, $path);
        recordMigration($pdo, $file, $batch);
        writeln('  OK');
    } catch (Throwable $e) {
        fail('Migracija nije uspjela (' . $file . '): ' . $e->getMessage());
    }
}

writeln('');
writeln('Sve migracije uspješno izvršene.');
