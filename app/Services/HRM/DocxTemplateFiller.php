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

        foreach ($values as $key => $value) {
            $safe = htmlspecialchars((string) $value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
            $xml = str_replace('${' . $key . '}', $safe, $xml);
        }

        $zip->deleteName('word/document.xml');
        $zip->addFromString('word/document.xml', $xml);
        $zip->close();

        if (!rename($temp, $outputPath)) {
            @unlink($temp);
            throw new RuntimeException('Unable to write generated DOCX file.');
        }
    }
}
