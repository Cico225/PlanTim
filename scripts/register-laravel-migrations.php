<?php
/**
 * Jednokratno na serveru: oznaci postojece Laravel PHP migracije kao izvrsene.
 * Koristi kad je baza kopirana/importovana, a migrations tabela nije kompletna.
 *
 * Upotreba: php scripts/register-laravel-migrations.php
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$migrationPath = database_path('migrations');
$files = glob($migrationPath . DIRECTORY_SEPARATOR . '*.php') ?: [];

if ($files === []) {
    echo "Nema Laravel PHP migracija.\n";
    exit(0);
}

$batch = (int) DB::table('migrations')->max('batch') + 1;
$added = 0;

foreach ($files as $file) {
    $name = pathinfo($file, PATHINFO_FILENAME);

    $exists = DB::table('migrations')->where('migration', $name)->exists();
    if ($exists) {
        continue;
    }

    DB::table('migrations')->insert([
        'migration' => $name,
        'batch' => $batch,
    ]);

    echo "Registrovano: {$name}\n";
    $added++;
}

echo "\nGotovo. Dodano migracija: {$added}\n";
echo "Sada pokreni: php artisan migrate --force\n";
