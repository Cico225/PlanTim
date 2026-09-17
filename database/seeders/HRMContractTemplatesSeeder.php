<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use ZipArchive;

class HRMContractTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('hrm_contract_settings')->count() === 0) {
            DB::table('hrm_contract_settings')->insert([
                'default_renewal_notice_days' => 30,
                'auto_create_renewal_draft' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $templates = [
            ['code' => 'fbih_store_manager', 'name' => 'FBiH — Šef prodavnice', 'legal_entity' => 'fbih', 'job_role' => 'store_manager', 'document_kind' => 'full_contract', 'template_file' => 'FBiH - Sef prodavnice.doc', 'output_format' => 'docx'],
            ['code' => 'fbih_deputy_manager', 'name' => 'FBiH — Zamjenik šefa prodavnice', 'legal_entity' => 'fbih', 'job_role' => 'deputy_manager', 'document_kind' => 'full_contract', 'template_file' => 'FBiH - Zamjenik sefa prodavnice.doc', 'output_format' => 'docx'],
            ['code' => 'fbih_salesperson', 'name' => 'FBiH — Prodavač', 'legal_entity' => 'fbih', 'job_role' => 'salesperson', 'document_kind' => 'full_contract', 'template_file' => 'KFBiH - prodavac.doc', 'output_format' => 'docx'],
            ['code' => 'rs_store_manager', 'name' => 'RS — Šef prodavnice (aneks)', 'legal_entity' => 'rs', 'job_role' => 'store_manager', 'document_kind' => 'annex', 'template_file' => 'RS - Sef prodavnice.docx', 'output_format' => 'docx'],
            ['code' => 'rs_deputy_manager', 'name' => 'RS — Zamjenik šefa prodavnice (aneks)', 'legal_entity' => 'rs', 'job_role' => 'deputy_manager', 'document_kind' => 'annex', 'template_file' => 'RS - Zamjenik sefa prodavnice.docx', 'output_format' => 'docx'],
            ['code' => 'rs_salesperson', 'name' => 'RS — Prodavač (aneks)', 'legal_entity' => 'rs', 'job_role' => 'salesperson', 'document_kind' => 'annex', 'template_file' => 'RS - prodavac.docx', 'output_format' => 'docx'],
            ['code' => 'bd_store_manager', 'name' => 'BD — Šef prodavnice', 'legal_entity' => 'bd', 'job_role' => 'store_manager', 'document_kind' => 'full_contract', 'template_file' => 'BD - Sef prodavnica.doc', 'output_format' => 'docx'],
            ['code' => 'bd_deputy_manager', 'name' => 'BD — Zamjenik šefa prodavnice', 'legal_entity' => 'bd', 'job_role' => 'deputy_manager', 'document_kind' => 'full_contract', 'template_file' => 'BD - Zamjenik sefa prodavnice.doc', 'output_format' => 'docx'],
            ['code' => 'bd_salesperson', 'name' => 'BD — Prodavač', 'legal_entity' => 'bd', 'job_role' => 'salesperson', 'document_kind' => 'full_contract', 'template_file' => 'BD - Prodavac.doc', 'output_format' => 'docx'],
        ];

        foreach ($templates as $template) {
            DB::table('hrm_contract_templates')->updateOrInsert(
                ['code' => $template['code']],
                array_merge($template, [
                    'placeholder_keys' => json_encode(array_keys($this->defaultPlaceholders($template['document_kind']))),
                    'is_active' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ])
            );
        }

        $this->prepareRsDocxTemplates();
        $this->prepareFbihBdDocxTemplates();
    }

    private function prepareFbihBdDocxTemplates(): void
    {
        $preparedDir = storage_path('app/hr-contract-templates/prepared');
        File::ensureDirectoryExists($preparedDir);

        $builder = new \App\Services\HRM\FullContractDocxBuilder();
        $fbih = $builder->fbihParagraphs();
        $bd = $builder->bdParagraphs();

        foreach ([
            'FBiH - Sef prodavnice.docx' => $fbih,
            'FBiH - Zamjenik sefa prodavnice.docx' => $fbih,
            'KFBiH - prodavac.docx' => $fbih,
            'BD - Sef prodavnica.docx' => $bd,
            'BD - Zamjenik sefa prodavnice.docx' => $bd,
            'BD - Prodavac.docx' => $bd,
        ] as $file => $paragraphs) {
            $builder->build($preparedDir . DIRECTORY_SEPARATOR . $file, $paragraphs);
        }
    }

    private function defaultPlaceholders(string $documentKind): array
    {
        if ($documentKind === 'annex') {
            return [
                'employee_full_name' => '',
                'employee_address' => '',
                'employee_education' => '',
                'annex_number' => '',
                'parent_contract_number' => '',
                'parent_contract_date' => '',
                'salary_bruto' => '',
                'salary_neto' => '',
                'effective_date' => '',
                'annex_sign_date' => '',
                'protocol_number' => '',
            ];
        }

        return [
            'contract_sign_date' => '',
            'employee_full_name' => '',
            'employee_origin' => '',
            'employee_address' => '',
            'employee_education' => '',
            'employment_term_text' => '',
            'work_start_date' => '',
            'position_title' => '',
            'store_name' => '',
            'store_city' => '',
            'salary_gross' => '',
            'effective_date' => '',
            'contract_number' => '',
            'employee_signature_name' => '',
        ];
    }

    private function prepareRsDocxTemplates(): void
    {
        $preparedDir = storage_path('app/hr-contract-templates/prepared');
        File::ensureDirectoryExists($preparedDir);

        $files = [
            'RS - Šef prodavnice.docx',
            'RS - Zamjenik šefa prodavnice.docx',
            'RS - prodavač.docx',
        ];

        $replacements = [
            'MIRJANA VUKLIŠEVIĆ' => '${employee_full_name}',
            'MILANOVIĆ VESNA' => '${employee_full_name}',
            'JANKOVIĆ DAJANA' => '${employee_full_name}',
            '367/25' => '${parent_contract_number}',
            '1055/25' => '${parent_contract_number}',
            '366/25' => '${parent_contract_number}',
            '04.02.2025.' => '${parent_contract_date}',
            '01.08.2025.' => '${parent_contract_date}',
            '1672,13' => '${salary_bruto}',
            '1558,20' => '${salary_bruto}',
            '1100,00' => '${salary_neto}',
            '1050,00' => '${salary_neto}',
            '01.01.2026.' => '${effective_date}',
            '16.01.2026.' => '${annex_sign_date}',
            '42/26' => '${protocol_number}',
            '41/26' => '${protocol_number}',
            '40/26' => '${protocol_number}',
            'ANEKS UGOVORA O RADU BR. 1' => 'ANEKS UGOVORA O RADU BR. ${annex_number}',
        ];

        foreach ($files as $file) {
            $source = storage_path('app/hr-contract-templates/' . $file);
            $target = $preparedDir . DIRECTORY_SEPARATOR . $file;

            if (!file_exists($source)) {
                continue;
            }

            copy($source, $target);

            $zip = new ZipArchive();
            if ($zip->open($target) !== true) {
                continue;
            }

            $xml = $zip->getFromName('word/document.xml');
            if ($xml === false) {
                $zip->close();
                continue;
            }

            foreach ($replacements as $search => $replace) {
                $xml = str_replace($search, $replace, $xml);
            }

            $zip->deleteName('word/document.xml');
            $zip->addFromString('word/document.xml', $xml);
            $zip->close();
        }
    }
}
