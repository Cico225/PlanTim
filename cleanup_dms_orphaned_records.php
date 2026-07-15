<?php

/**
 * DMS Cleanup Script - Briše zapise o folderima i dokumentima koji ne postoje na disku
 * 
 * Ovaj script briše iz baze podataka:
 * 1. Foldere čiji fizički direktorijumi ne postoje na disku
 * 2. Dokumente čiji fizički fajlovi ne postoje na disku
 * 3. Document versions čiji fizički fajlovi ne postoje na disku
 * 
 * Pokretanje: php cleanup_dms_orphaned_records.php
 */

require_once 'vendor/autoload.php';

// Učitaj Laravel environment
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DMSCleanup
{
    private $dryRun = true; // Postaviti na false za stvarno brisanje
    private $deletedFolders = 0;
    private $deletedDocuments = 0;
    private $deletedVersions = 0;
    
    public function __construct($dryRun = true)
    {
        $this->dryRun = $dryRun;
    }
    
    public function run()
    {
        echo "=== DMS CLEANUP SCRIPT ===\n";
        echo "Dry Run: " . ($this->dryRun ? "DA" : "NE") . "\n";
        echo "==========================\n\n";
        
        $this->cleanupOrphanedFolders();
        $this->cleanupOrphanedDocuments();
        $this->cleanupOrphanedDocumentVersions();
        
        echo "\n=== REZULTAT ===\n";
        echo "Obrisani folderi: {$this->deletedFolders}\n";
        echo "Obrisani dokumenti: {$this->deletedDocuments}\n";
        echo "Obrisane verzije: {$this->deletedVersions}\n";
        
        if ($this->dryRun) {
            echo "\n⚠️  OVO JE BIO DRY RUN - NIŠTA NIJE OBRISANO!\n";
            echo "Za stvarno brisanje pokrenite: php cleanup_dms_orphaned_records.php --execute\n";
        }
    }
    
    /**
     * Briše foldere čiji fizički direktorijumi ne postoje
     */
    private function cleanupOrphanedFolders()
    {
        echo "1. Proverava foldere...\n";
        
        // Uzmi sve foldere iz baze (koristimo tabelu iz migracije)
        $folders = DB::table('dms_folders')->get();
        
        foreach ($folders as $folder) {
            // Konstruiši fizičku putanju
            $physicalPath = storage_path('app/public/documents');
            
            if (!empty($folder->path)) {
                $physicalPath .= '/' . str_replace('/', DIRECTORY_SEPARATOR, $folder->path);
            }
            
            // Proveri da li direktorijum postoji
            if (!is_dir($physicalPath)) {
                echo "   ❌ Folder ne postoji: {$folder->name} (Path: {$folder->path})\n";
                echo "      Fizička putanja: {$physicalPath}\n";
                
                if (!$this->dryRun) {
                    // Prvo obriši sve dokumente u ovom folderu
                    DB::table('dms_documents')->where('folder_id', $folder->id)->delete();
                    
                    // Zatim obriši subfoldere (rekurzivno)
                    $this->deleteSubfolders($folder->id);
                    
                    // Na kraju obriši sam folder
                    DB::table('dms_folders')->where('id', $folder->id)->delete();
                }
                
                $this->deletedFolders++;
            } else {
                echo "   ✅ Folder OK: {$folder->name}\n";
            }
        }
        
        echo "Završeno sa folderima.\n\n";
    }
    
    /**
     * Rekurzivno briše subfoldere
     */
    private function deleteSubfolders($parentId)
    {
        $subfolders = DB::table('dms_folders')->where('parent_folder_id', $parentId)->get();
        
        foreach ($subfolders as $subfolder) {
            // Obriši dokumente u subfolderu
            DB::table('dms_documents')->where('folder_id', $subfolder->id)->delete();
            
            // Rekurzivno obriši sub-subfoldere
            $this->deleteSubfolders($subfolder->id);
            
            // Obriši subfolder
            DB::table('dms_folders')->where('id', $subfolder->id)->delete();
        }
    }
    
    /**
     * Briše dokumente čiji fizički fajlovi ne postoje
     */
    private function cleanupOrphanedDocuments()
    {
        echo "2. Proverava dokumente...\n";
        
        // Uzmi sve dokumente iz baze
        $documents = DB::table('dms_documents')->get();
        
        foreach ($documents as $document) {
            // Konstruiši fizičku putanju fajla
            $physicalPath = storage_path('app/public/' . $document->file_path);
            
            // Proveri da li fajl postoji
            if (!file_exists($physicalPath)) {
                echo "   ❌ Dokument ne postoji: {$document->name}\n";
                echo "      Fizička putanja: {$physicalPath}\n";
                
                if (!$this->dryRun) {
                    // Obriši sve verzije ovog dokumenta
                    DB::table('dms_document_versions')->where('document_id', $document->id)->delete();
                    
                    // Obriši share linkove
                    DB::table('dms_share_links')->where('document_id', $document->id)->delete();
                    
                    // Obriši permissions
                    DB::table('dms_permissions')
                        ->where('permissionable_type', 'App\\Models\\DMSDocument')
                        ->where('permissionable_id', $document->id)
                        ->delete();
                    
                    // Obriši dokument
                    DB::table('dms_documents')->where('id', $document->id)->delete();
                }
                
                $this->deletedDocuments++;
            } else {
                echo "   ✅ Dokument OK: {$document->name}\n";
            }
        }
        
        echo "Završeno sa dokumentima.\n\n";
    }
    
    /**
     * Briše verzije dokumenata čiji fizički fajlovi ne postoje
     */
    private function cleanupOrphanedDocumentVersions()
    {
        echo "3. Proverava verzije dokumenata...\n";
        
        // Uzmi sve verzije iz baze
        $versions = DB::table('dms_document_versions')->get();
        
        foreach ($versions as $version) {
            // Konstruiši fizičku putanju fajla verzije
            $physicalPath = storage_path('app/public/' . $version->file_path);
            
            // Proveri da li fajl postoji
            if (!file_exists($physicalPath)) {
                echo "   ❌ Verzija ne postoji: {$version->file_name} (v{$version->version})\n";
                echo "      Fizička putanja: {$physicalPath}\n";
                
                if (!$this->dryRun) {
                    DB::table('dms_document_versions')->where('id', $version->id)->delete();
                }
                
                $this->deletedVersions++;
            } else {
                echo "   ✅ Verzija OK: {$version->file_name} (v{$version->version})\n";
            }
        }
        
        echo "Završeno sa verzijama.\n\n";
    }
}

// Pokreni cleanup
$dryRun = !in_array('--execute', $argv);
$cleanup = new DMSCleanup($dryRun);
$cleanup->run();
















