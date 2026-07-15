<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DocumentTextExtractorService
{
    /**
     * Extract text from document based on mime type
     */
    public function extractText($filePath, $mimeType, $originalName = null)
    {
        try {
            if (!file_exists($filePath)) {
                Log::warning('DocumentTextExtractor: File not found', ['path' => $filePath]);
                return null;
            }

            // Extract based on mime type
            if (strpos($mimeType, 'pdf') !== false) {
                return $this->extractFromPdf($filePath);
            } elseif (strpos($mimeType, 'msword') !== false || 
                      strpos($mimeType, 'wordprocessingml') !== false ||
                      in_array(pathinfo($originalName, PATHINFO_EXTENSION), ['doc', 'docx'])) {
                return $this->extractFromWord($filePath);
            } elseif (strpos($mimeType, 'spreadsheetml') !== false ||
                      strpos($mimeType, 'ms-excel') !== false ||
                      in_array(pathinfo($originalName, PATHINFO_EXTENSION), ['xls', 'xlsx'])) {
                return $this->extractFromExcel($filePath);
            } elseif (strpos($mimeType, 'text/') !== false) {
                return $this->extractFromText($filePath);
            } elseif (in_array(pathinfo($originalName, PATHINFO_EXTENSION), ['txt', 'csv'])) {
                return $this->extractFromText($filePath);
            }

            return null;
        } catch (\Exception $e) {
            Log::error('DocumentTextExtractor: Failed to extract text', [
                'path' => $filePath,
                'mime_type' => $mimeType,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Extract text from PDF
     */
    protected function extractFromPdf($filePath)
    {
        try {
            // Try using smalot/pdfparser if available
            if (class_exists('\Smalot\PdfParser\Parser')) {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($filePath);
                $text = $pdf->getText();
                return $this->cleanText($text);
            }

            // Fallback: Try pdftotext command if available (Linux/Unix)
            if (function_exists('shell_exec') && $this->commandExists('pdftotext')) {
                $output = shell_exec("pdftotext " . escapeshellarg($filePath) . " - 2>&1");
                if ($output !== null) {
                    return $this->cleanText($output);
                }
            }

            // Last resort: Return null if no PDF parser available
            Log::warning('DocumentTextExtractor: No PDF parser available');
            return null;
        } catch (\Exception $e) {
            Log::error('DocumentTextExtractor: PDF extraction failed', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Extract text from Word document
     */
    protected function extractFromWord($filePath)
    {
        try {
            // Check if PhpOffice\PhpWord is available
            if (class_exists('\PhpOffice\PhpWord\IOFactory')) {
                $phpWord = \PhpOffice\PhpWord\IOFactory::load($filePath);
                $text = '';
                
                foreach ($phpWord->getSections() as $section) {
                    foreach ($section->getElements() as $element) {
                        if (method_exists($element, 'getText')) {
                            $text .= $element->getText() . "\n";
                        } elseif ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
                            foreach ($element->getElements() as $textElement) {
                                if (method_exists($textElement, 'getText')) {
                                    $text .= $textElement->getText();
                                }
                            }
                            $text .= "\n";
                        }
                    }
                }
                
                return $this->cleanText($text);
            }

            Log::warning('DocumentTextExtractor: PhpWord not available for Word extraction');
            return null;
        } catch (\Exception $e) {
            Log::error('DocumentTextExtractor: Word extraction failed', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Extract text from Excel document
     */
    protected function extractFromExcel($filePath)
    {
        try {
            // Use PhpSpreadsheet if available
            if (class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $text = '';
                
                foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                    foreach ($worksheet->getRowIterator() as $row) {
                        $cellIterator = $row->getCellIterator();
                        $cellIterator->setIterateOnlyExistingCells(false);
                        
                        foreach ($cellIterator as $cell) {
                            $value = $cell->getCalculatedValue();
                            if ($value !== null && $value !== '') {
                                $text .= $value . ' ';
                            }
                        }
                        $text .= "\n";
                    }
                }
                
                return $this->cleanText($text);
            }

            Log::warning('DocumentTextExtractor: PhpSpreadsheet not available for Excel extraction');
            return null;
        } catch (\Exception $e) {
            Log::error('DocumentTextExtractor: Excel extraction failed', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Extract text from plain text file
     */
    protected function extractFromText($filePath)
    {
        try {
            $content = file_get_contents($filePath);
            // Limit text extraction to prevent memory issues (first 500KB)
            if (strlen($content) > 500000) {
                $content = substr($content, 0, 500000);
            }
            return $this->cleanText($content);
        } catch (\Exception $e) {
            Log::error('DocumentTextExtractor: Text extraction failed', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Clean extracted text
     */
    protected function cleanText($text)
    {
        if (empty($text)) {
            return null;
        }

        // Remove excessive whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Remove special characters that might cause issues
        $text = preg_replace('/[^\p{L}\p{N}\s.,;:!?()\-_\/]/u', ' ', $text);
        
        // Trim and limit length (max 1MB of text to prevent database issues)
        $text = trim($text);
        if (strlen($text) > 1000000) {
            $text = substr($text, 0, 1000000);
        }

        return $text;
    }

    /**
     * Check if command exists in system
     */
    protected function commandExists($command)
    {
        $whereIsCommand = (PHP_OS == 'WINNT') ? 'where' : 'which';
        $process = proc_open(
            "$whereIsCommand $command",
            [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes
        );
        
        if ($process !== false) {
            $stdout = stream_get_contents($pipes[1]);
            $returnCode = proc_close($process);
            return $returnCode === 0 && !empty($stdout);
        }
        
        return false;
    }
}


















