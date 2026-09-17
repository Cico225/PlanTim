<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$map = [
    'fbih_store_manager' => ['FBiH - Sef prodavnice.doc', 'docx'],
    'fbih_deputy_manager' => ['FBiH - Zamjenik sefa prodavnice.doc', 'docx'],
    'fbih_salesperson' => ['KFBiH - prodavac.doc', 'docx'],
    'bd_store_manager' => ['BD - Sef prodavnica.doc', 'docx'],
    'bd_deputy_manager' => ['BD - Zamjenik sefa prodavnice.doc', 'docx'],
    'bd_salesperson' => ['BD - Prodavac.doc', 'docx'],
];

foreach ($map as $code => [$file, $fmt]) {
    Illuminate\Support\Facades\DB::table('hrm_contract_templates')->where('code', $code)->update([
        'template_file' => $file,
        'output_format' => $fmt,
        'updated_at' => now(),
    ]);
    echo "updated {$code}\n";
}

$b = new App\Services\HRM\FullContractDocxBuilder();
$dir = storage_path('app/hr-contract-templates/prepared');
@mkdir($dir, 0775, true);

foreach ([
    'FBiH - Sef prodavnice.docx' => $b->fbihParagraphs(),
    'FBiH - Zamjenik sefa prodavnice.docx' => $b->fbihParagraphs(),
    'KFBiH - prodavac.docx' => $b->fbihParagraphs(),
    'BD - Sef prodavnica.docx' => $b->bdParagraphs(),
    'BD - Zamjenik sefa prodavnice.docx' => $b->bdParagraphs(),
    'BD - Prodavac.docx' => $b->bdParagraphs(),
] as $name => $p) {
    $path = $dir . DIRECTORY_SEPARATOR . $name;
    $b->build($path, $p);
    echo 'built ' . $name . ' size=' . filesize($path) . PHP_EOL;
}

$template = Illuminate\Support\Facades\DB::table('hrm_contract_templates')->where('code', 'fbih_salesperson')->first();
$contract = (object) [
    'id' => 999001,
    'contract_sign_date' => '2026-01-28',
    'work_start_date' => '2026-01-01',
    'work_end_date' => null,
    'effective_date' => '2026-01-01',
    'employee_full_name' => 'DAMIR DAMIR',
    'employee_origin' => 'Sarajevo',
    'employee_address' => 'ul. Test 1',
    'employee_education' => 'SSS',
    'position_title' => 'Prodavač',
    'store_name' => 'TEST',
    'store_city' => 'Sarajevo',
    'salary_gross' => 1200,
    'salary_net' => 900,
    'contract_number' => '1/26',
    'protocol_number' => null,
    'employment_term' => 'indefinite',
    'annex_number' => 1,
    'custom_fields' => null,
];
$svc = app(App\Services\HRM\ContractDocumentService::class);
$path = $svc->generate($contract, $template);
echo "generated={$path}\n";
echo 'exists=' . (is_file(storage_path('app/' . $path)) ? 'yes' : 'no') . PHP_EOL;
echo 'ext=' . pathinfo($path, PATHINFO_EXTENSION) . PHP_EOL;
