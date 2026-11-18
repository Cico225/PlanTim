<?php

namespace App\Services\HRM;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use stdClass;

class DecisionDocumentService
{
    public function __construct(private readonly DocxTemplateFiller $docxFiller)
    {
    }

    /**
     * @param  array<string, string>  $values
     */
    public function generate(stdClass $decision, ?stdClass $template, array $values): string
    {
        $directory = 'hr-decisions/' . date('Y/m');
        Storage::disk('local')->makeDirectory($directory);
        $baseName = sprintf('rjesenje_%s_%s', $decision->id, now()->format('Ymd_His'));

        $docx = $this->resolveDocx($template);
        if ($docx) {
            $relative = $directory . '/' . $baseName . '.docx';
            $this->docxFiller->fill($docx, $values, storage_path('app/' . $relative));

            return $relative;
        }

        $html = $this->html($values);
        $relative = $directory . '/' . $baseName . '.pdf';
        Storage::disk('local')->put($relative, Pdf::loadHTML($html)->setPaper('a4')->output());

        return $relative;
    }

    private function resolveDocx(?stdClass $template): ?string
    {
        if (!$template || empty($template->template_file)) {
            return null;
        }

        $path = storage_path('app/hr-decision-templates/' . ltrim((string) $template->template_file, '/\\'));
        if (is_file($path) && preg_match('/\.docx$/i', $path) && filesize($path) > 500) {
            return $path;
        }

        return null;
    }

    /**
     * @param  array<string, string>  $values
     */
    private function html(array $values): string
    {
        $e = static fn (string $key) => htmlspecialchars($values[$key] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $period = trim($e('date_from') . ($values['date_to'] ?? '' ? ' — ' . $e('date_to') : ''));

        return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; line-height: 1.45; }
            h1 { text-align: center; font-size: 16px; letter-spacing: 1px; }
            .meta { margin: 18px 0; }
            .line { margin: 8px 0; }
            .sign { margin-top: 48px; }
            </style></head><body>
            <div class="line">' . $e('sign_city') . ', ' . $e('decision_date') . '</div>
            <div class="line"><strong>Broj: ' . $e('decision_number') . '</strong></div>
            <h1>' . $e('title') . '</h1>
            <div class="meta">
                <div class="line">Poslodavac: ' . $e('employer_name') . '</div>
                <div class="line">Radnik: <strong>' . $e('employee_name') . '</strong></div>
                <div class="line">Ugovor o radu: ' . $e('contract_number') . '</div>
            </div>
            <p>Na osnovu ugovora o radu i važećih propisa, donosi se ovo rješenje.</p>
            <p>' . nl2br($e('body')) . '</p>'
            . ($period !== '' && $period !== '—' ? '<p>Period: ' . $period . '</p>' : '')
            . (($values['days'] ?? '') !== '' ? '<p>Broj dana: <strong>' . $e('days') . '</strong></p>' : '')
            . (($values['leave_year'] ?? '') !== '' ? '<p>Godina godišnjeg odmora: ' . $e('leave_year') . '. Iskorišteno: ' . $e('used_days') . ', ostalo: ' . $e('remaining_days') . '.</p>' : '')
            . '<div class="sign"><div>Direktor</div><div style="margin-top:28px;">' . $e('director_name') . '</div></div>
            </body></html>';
    }
};
