<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

DB::table('system_modules')->where('name', 'planika.finance.krediti')->update([
    'display_name' => 'Krediti — Upravljanje administrativnim zabranama',
    'description' => 'Uvoz, uparivanje administrativnih zabrana i izvještaji',
    'updated_at' => now(),
]);

$exists = DB::table('system_modules')->where('name', 'planika.finance.ugovori')->exists();

if (!$exists) {
    DB::table('system_modules')->insert([
        'name' => 'planika.finance.ugovori',
        'parent_name' => 'planika.finance',
        'display_name' => 'Krediti — Spiskovi aktivnih ugovora',
        'description' => 'Pregled spiskova aktivnih kreditnih ugovora',
        'icon' => 'FiFileText',
        'route' => '/planika/finance/ugovori',
        'available_permissions' => json_encode(['view', 'export']),
        'is_active' => 1,
        'is_plugin' => 1,
        'sort_order' => 113,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

echo "system_modules updated\n";
