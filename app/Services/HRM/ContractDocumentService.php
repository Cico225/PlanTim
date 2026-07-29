<?php

namespace App\Services\HRM;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use stdClass;

class ContractDocumentService
{
    public function __construct(
        private readonly DocxTemplateFiller $docxFiller
    ) {
    }

    /**
     * @param  stdClass  $contract
     * @param  stdClass  $template
     */
    public function generate(stdClass $contract, stdClass $template, ?stdClass $parentContract = null): string
    {
        $values = $this->buildPlaceholderValues($contract, $template, $parentContract);
        $directory = 'hr-contracts/' . date('Y/m');
        Storage::disk('local')->makeDirectory($directory);

        $baseName = sprintf(
            'ugovor_%s_%s_%s',
            $contract->id,
            $template->code,
            now()->format('Ymd_His')
        );

        if ($template->output_format === 'docx') {
            $templatePath = storage_path('app/hr-contract-templates/' . $template->template_file);
            $outputRelative = $directory . '/' . $baseName . '.docx';
            $outputPath = storage_path('app/' . $outputRelative);

            $preparedPath = storage_path('app/hr-contract-templates/prepared/' . $template->template_file);
            $sourcePath = file_exists($preparedPath) ? $preparedPath : $templatePath;

            $this->docxFiller->fill($sourcePath, $values, $outputPath);

            return $outputRelative;
        }

        $view = match ($template->code) {
            'fbih_store_manager', 'fbih_deputy_manager', 'fbih_salesperson' => 'hr.contracts.fbih-full',
            'bd_store_manager', 'bd_deputy_manager', 'bd_salesperson' => 'hr.contracts.bd-full',
            default => 'hr.contracts.fbih-full',
        };

        $pdf = Pdf::loadView($view, [
            'contract' => $contract,
            'template' => $template,
            'values' => $values,
        ])->setPaper('a4');

        $outputRelative = $directory . '/' . $baseName . '.pdf';
        Storage::disk('local')->put($outputRelative, $pdf->output());

        return $outputRelative;
    }

    /**
     * @return array<string, string>
     */
    public function buildPlaceholderValues(stdClass $contract, stdClass $template, ?stdClass $parentContract = null): array
    {
        $formatDate = static fn (?string $date) => $date
            ? \Carbon\Carbon::parse($date)->format('d.m.Y') . '.'
            : '';

        $salaryGross = number_format((float) ($contract->salary_gross ?? 0), 2, ',', '');
        $salaryNet = number_format((float) ($contract->salary_net ?? 0), 2, ',', '');

        $values = [
            'contract_sign_date' => $formatDate($contract->contract_sign_date),
            'work_start_date' => $formatDate($contract->work_start_date),
            'work_end_date' => $formatDate($contract->work_end_date),
            'effective_date' => $formatDate($contract->effective_date ?? $contract->work_start_date),
            'employee_full_name' => strtoupper((string) ($contract->employee_full_name ?? '')),
            'employee_origin' => (string) ($contract->employee_origin ?? ''),
            'employee_address' => (string) ($contract->employee_address ?? ''),
            'employee_education' => (string) ($contract->employee_education ?? ''),
            'position_title' => (string) ($contract->position_title ?? $this->defaultPositionTitle($template->job_role)),
            'store_name' => strtoupper((string) ($contract->store_name ?? '')),
            'store_city' => (string) ($contract->store_city ?? ''),
            'salary_gross' => $salaryGross,
            'salary_net' => $salaryNet,
            'salary_bruto' => $salaryGross,
            'salary_neto' => $salaryNet,
            'contract_number' => (string) ($contract->contract_number ?? ''),
            'protocol_number' => (string) ($contract->protocol_number ?? ''),
            'employment_term_text' => $contract->employment_term === 'fixed'
                ? 'na određeno vrijeme'
                : 'na neodređeno vrijeme',
            'employee_signature_name' => strtoupper((string) ($contract->employee_full_name ?? '')),
            'annex_number' => (string) ($contract->annex_number ?? 1),
            'annex_sign_date' => $formatDate($contract->contract_sign_date),
            'parent_contract_number' => (string) ($parentContract->contract_number ?? ''),
            'parent_contract_date' => $formatDate($parentContract->contract_sign_date ?? $parentContract->work_start_date ?? null),
        ];

        if (!empty($contract->custom_fields)) {
            $custom = is_string($contract->custom_fields)
                ? json_decode($contract->custom_fields, true)
                : (array) $contract->custom_fields;

            foreach ($custom as $key => $value) {
                if (is_scalar($value)) {
                    $values[(string) $key] = (string) $value;
                }
            }
        }

        return $values;
    }

    private function defaultPositionTitle(string $jobRole): string
    {
        return match ($jobRole) {
            'store_manager' => 'Poslovođa',
            'deputy_manager' => 'Zamjenik poslovođe - Prodavač',
            default => 'Prodavač',
        };
    }
}
