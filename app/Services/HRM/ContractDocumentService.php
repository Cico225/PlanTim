<?php

namespace App\Services\HRM;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use stdClass;

class ContractDocumentService
{
    public function __construct(
        private readonly DocxTemplateFiller $docxFiller,
        private readonly FullContractDocxBuilder $docxBuilder
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

        // Ensure prepared full-contract DOCX exists for FBiH/BD .doc templates
        $this->ensurePreparedFullContractDocx($template);

        // Prefer real Word template so formatting matches the šablon.
        $docxSource = $this->resolveDocxTemplatePath($template);
        if ($docxSource !== null) {
            $outputRelative = $directory . '/' . $baseName . '.docx';
            $outputPath = storage_path('app/' . $outputRelative);
            $this->docxFiller->fill($docxSource, $values, $outputPath);

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
     * Build prepared DOCX (Word-like formatting) for legacy .doc FBiH/BD templates.
     */
    private function ensurePreparedFullContractDocx(stdClass $template): void
    {
        $file = ltrim((string) ($template->template_file ?? ''), '/\\');
        if ($file === '' || !preg_match('/\.doc$/i', $file)) {
            return;
        }

        $code = (string) ($template->code ?? '');
        $isFbih = str_starts_with($code, 'fbih_') || ($template->legal_entity ?? '') === 'fbih';
        $isBd = str_starts_with($code, 'bd_') || ($template->legal_entity ?? '') === 'bd';
        if (!$isFbih && !$isBd) {
            return;
        }

        $docxName = preg_replace('/\.doc$/i', '.docx', $file) ?: ($file . 'x');
        $preparedPath = storage_path('app/hr-contract-templates/prepared/' . $docxName);

        // Also map common disk filenames without diacritics
        $aliases = $this->preparedDocxAliases($file, $isFbih, $isBd);

        $paragraphs = $isBd ? $this->docxBuilder->bdParagraphs() : $this->docxBuilder->fbihParagraphs();

        foreach ($aliases as $aliasName) {
            $path = storage_path('app/hr-contract-templates/prepared/' . $aliasName);
            if (!is_file($path) || filesize($path) < 1000) {
                $this->docxBuilder->build($path, $paragraphs);
            }
        }

        if (!is_file($preparedPath) || filesize($preparedPath) < 1000) {
            $this->docxBuilder->build($preparedPath, $paragraphs);
        }
    }

    /**
     * @return list<string>
     */
    private function preparedDocxAliases(string $templateFile, bool $isFbih, bool $isBd): array
    {
        $base = preg_replace('/\.docx?$/i', '', basename($templateFile)) ?: 'template';
        $names = [basename(preg_replace('/\.doc$/i', '.docx', $templateFile) ?: ($base . '.docx'))];

        if ($isFbih) {
            $names[] = 'FBiH - Sef prodavnice.docx';
            $names[] = 'FBiH - Zamjenik sefa prodavnice.docx';
            $names[] = 'KFBiH - prodavac.docx';
            $names[] = 'FBiH - Šef prodavnice.docx';
            $names[] = 'FBiH - Zamjenik šefa prodavnice.docx';
            $names[] = 'KFBiH - prodavač.docx';
        }
        if ($isBd) {
            $names[] = 'BD - Sef prodavnica.docx';
            $names[] = 'BD - Zamjenik sefa prodavnice.docx';
            $names[] = 'BD - Prodavac.docx';
            $names[] = 'BD - Šef prodavnica.docx';
            $names[] = 'BD - Prodavač.docx';
        }

        return array_values(array_unique($names));
    }

    /**
     * Resolve a fillable DOCX path for the template (prepared copy preferred).
     */
    private function resolveDocxTemplatePath(stdClass $template): ?string
    {
        $file = ltrim((string) ($template->template_file ?? ''), '/\\');
        if ($file === '') {
            return null;
        }

        $baseDir = storage_path('app/hr-contract-templates');
        $candidates = [];

        // Explicit prepared override (same filename)
        $candidates[] = $baseDir . DIRECTORY_SEPARATOR . 'prepared' . DIRECTORY_SEPARATOR . $file;

        // If stored as .doc, also try prepared .docx sibling
        $docxName = preg_replace('/\.docx?$/i', '.docx', $file) ?: ($file . '.docx');
        $candidates[] = $baseDir . DIRECTORY_SEPARATOR . 'prepared' . DIRECTORY_SEPARATOR . $docxName;

        // Disk aliases without diacritics
        foreach ($this->preparedDocxAliases($file, str_starts_with((string) ($template->code ?? ''), 'fbih_') || ($template->legal_entity ?? '') === 'fbih', str_starts_with((string) ($template->code ?? ''), 'bd_') || ($template->legal_entity ?? '') === 'bd') as $alias) {
            $candidates[] = $baseDir . DIRECTORY_SEPARATOR . 'prepared' . DIRECTORY_SEPARATOR . $alias;
        }

        // Direct template file when already DOCX
        if (preg_match('/\.docx$/i', $file)) {
            $candidates[] = $baseDir . DIRECTORY_SEPARATOR . $file;
        }

        // Sibling .docx next to original .doc
        $candidates[] = $baseDir . DIRECTORY_SEPARATOR . $docxName;

        foreach (array_unique($candidates) as $path) {
            if (is_file($path) && filesize($path) > 500) {
                return $path;
            }
        }

        return null;
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

        $origin = trim((string) ($contract->employee_origin ?? ''));
        $address = trim((string) ($contract->employee_address ?? ''));
        $education = trim((string) ($contract->employee_education ?? ''));
        $fullName = strtoupper(trim((string) ($contract->employee_full_name ?? '')));
        $details = array_values(array_filter([$fullName, $origin, $address, $education], static fn ($p) => $p !== ''));

        $workEnd = $formatDate($contract->work_end_date);
        $workEndClause = $workEnd !== '' ? (', a ugovor važi do ' . $workEnd) : '';

        $values = [
            'contract_sign_date' => $formatDate($contract->contract_sign_date),
            'work_start_date' => $formatDate($contract->work_start_date),
            'work_end_date' => $workEnd,
            'work_end_clause' => $workEndClause,
            'effective_date' => $formatDate($contract->effective_date ?? $contract->work_start_date),
            'employee_full_name' => $fullName,
            'employee_origin' => $origin,
            'employee_address' => $address,
            'employee_education' => $education,
            'employee_details_line' => implode(', ', $details),
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
            'employee_signature_name' => $fullName,
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
