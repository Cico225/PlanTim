<?php

namespace App\Services\HRM;

use RuntimeException;
use ZipArchive;

class DocxTemplateFiller
{
    /**
     * @param  array<string, string>  $values
     */
    public function fill(string $templatePath, array $values, string $outputPath): void
    {
        if (!file_exists($templatePath)) {
            throw new RuntimeException('Template file not found: ' . $templatePath);
        }

        $temp = tempnam(sys_get_temp_dir(), 'hr_docx_');
        if ($temp === false || !copy($templatePath, $temp)) {
            throw new RuntimeException('Unable to prepare temporary DOCX file.');
        }

        $zip = new ZipArchive();
        if ($zip->open($temp) !== true) {
            @unlink($temp);
            throw new RuntimeException('Unable to open DOCX template.');
        }

        $xml = $zip->getFromName('word/document.xml');
        if ($xml === false) {
            $zip->close();
            @unlink($temp);
            throw new RuntimeException('Invalid DOCX template structure.');
        }

        // Word often splits "${key}" across multiple <w:t> runs — normalize first.
        $xml = $this->mergeSplitPlaceholders($xml);

        foreach ($values as $key => $value) {
            $safe = htmlspecialchars((string) $value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
            $xml = str_replace('${' . $key . '}', $safe, $xml);
        }

        $zip->deleteName('word/document.xml');
        $zip->addFromString('word/document.xml', $xml);
        $zip->close();

        $dir = dirname($outputPath);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            @unlink($temp);
            throw new RuntimeException('Unable to create output directory.');
        }

        if (!rename($temp, $outputPath)) {
            @unlink($temp);
            throw new RuntimeException('Unable to write generated DOCX file.');
        }
    }

    /**
     * Rejoin placeholders that Word split across runs, e.g.
     * ${</w:t></w:r><w:r><w:t>employee_full_name}
     */
    private function mergeSplitPlaceholders(string $xml): string
    {
        $previous = null;
        while ($previous !== $xml) {
            $previous = $xml;
            // Strip any XML tag that appears between "${" and the closing "}"
            $xml = preg_replace('/(\$\{[^\}]*?)<[^>]+>([^\}]*\})/', '$1$2', $xml) ?? $xml;
        }

        return $xml;
    }
}
