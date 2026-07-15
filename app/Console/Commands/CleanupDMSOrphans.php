<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CleanupDMSOrphans extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dms:cleanup-orphans {--execute : Actually delete the records (without this flag, it\'s a dry run)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleanup orphaned DMS records (folders and documents that don\'t exist on filesystem)';

    private $deletedFolders = 0;
    private $deletedDocuments = 0;
    private $deletedVersions = 0;

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $execute = $this->option('execute');
        
        $this->info('=== DMS CLEANUP ORPHANED RECORDS ===');
        $this->info('Mode: ' . ($execute ? 'EXECUTE' : 'DRY RUN'));
        $this->line('');

        if (!$execute) {
            $this->warn('⚠️  This is a DRY RUN - no records will be deleted!');
            $this->warn('Use --execute flag to actually delete records.');
            $this->line('');
        }

        $this->cleanupOrphanedFolders($execute);
        $this->cleanupOrphanedDocuments($execute);
        $this->cleanupOrphanedDocumentVersions($execute);

        $this->line('');
        $this->info('=== SUMMARY ===');
        $this->line("Folders to delete: {$this->deletedFolders}");
        $this->line("Documents to delete: {$this->deletedDocuments}");
        $this->line("Versions to delete: {$this->deletedVersions}");

        if (!$execute && ($this->deletedFolders > 0 || $this->deletedDocuments > 0 || $this->deletedVersions > 0)) {
            $this->line('');
            $this->warn('To actually delete these records, run:');
            $this->warn('php artisan dms:cleanup-orphans --execute');
        }

        return 0;
    }

    /**
     * Cleanup orphaned folders
     */
    private function cleanupOrphanedFolders($execute)
    {
        $this->info('1. Checking folders...');
        
        $folders = DB::table('dms_folders')->get();
        
        foreach ($folders as $folder) {
            // Build physical path
            $physicalPath = storage_path('app/public/documents');
            
            if (!empty($folder->path)) {
                $physicalPath .= '/' . str_replace('/', DIRECTORY_SEPARATOR, $folder->path);
            }
            
            // Check if directory exists
            if (!is_dir($physicalPath)) {
                $this->error("   ❌ Missing folder: {$folder->name} (Path: {$folder->path})");
                $this->line("      Physical path: {$physicalPath}");
                
                if ($execute) {
                    // Delete documents in this folder first
                    DB::table('dms_documents')->where('folder_id', $folder->id)->delete();
                    
                    // Delete subfolders recursively
                    $this->deleteSubfolders($folder->id);
                    
                    // Delete the folder itself
                    DB::table('dms_folders')->where('id', $folder->id)->delete();
                    
                    $this->line("      ✅ Deleted from database");
                }
                
                $this->deletedFolders++;
            } else {
                $this->line("   ✅ Folder OK: {$folder->name}");
            }
        }
        
        $this->line('');
    }

    /**
     * Recursively delete subfolders
     */
    private function deleteSubfolders($parentId)
    {
        $subfolders = DB::table('dms_folders')->where('parent_folder_id', $parentId)->get();
        
        foreach ($subfolders as $subfolder) {
            // Delete documents in subfolder
            DB::table('dms_documents')->where('folder_id', $subfolder->id)->delete();
            
            // Recursively delete sub-subfolders
            $this->deleteSubfolders($subfolder->id);
            
            // Delete subfolder
            DB::table('dms_folders')->where('id', $subfolder->id)->delete();
        }
    }

    /**
     * Cleanup orphaned documents
     */
    private function cleanupOrphanedDocuments($execute)
    {
        $this->info('2. Checking documents...');
        
        $documents = DB::table('dms_documents')->get();
        
        foreach ($documents as $document) {
            // Build physical file path
            $physicalPath = storage_path('app/public/' . $document->file_path);
            
            // Check if file exists
            if (!file_exists($physicalPath)) {
                $this->error("   ❌ Missing document: {$document->name}");
                $this->line("      Physical path: {$physicalPath}");
                
                if ($execute) {
                    // Delete document versions
                    DB::table('dms_document_versions')->where('document_id', $document->id)->delete();
                    
                    // Delete share links
                    DB::table('dms_share_links')->where('document_id', $document->id)->delete();
                    
                    // Delete permissions
                    DB::table('dms_permissions')
                        ->where('permissionable_type', 'App\\Models\\DMSDocument')
                        ->where('permissionable_id', $document->id)
                        ->delete();
                    
                    // Delete document
                    DB::table('dms_documents')->where('id', $document->id)->delete();
                    
                    $this->line("      ✅ Deleted from database");
                }
                
                $this->deletedDocuments++;
            } else {
                $this->line("   ✅ Document OK: {$document->name}");
            }
        }
        
        $this->line('');
    }

    /**
     * Cleanup orphaned document versions
     */
    private function cleanupOrphanedDocumentVersions($execute)
    {
        $this->info('3. Checking document versions...');
        
        $versions = DB::table('dms_document_versions')->get();
        
        foreach ($versions as $version) {
            // Build physical file path
            $physicalPath = storage_path('app/public/' . $version->file_path);
            
            // Check if file exists
            if (!file_exists($physicalPath)) {
                $this->error("   ❌ Missing version: {$version->file_name} (v{$version->version})");
                $this->line("      Physical path: {$physicalPath}");
                
                if ($execute) {
                    DB::table('dms_document_versions')->where('id', $version->id)->delete();
                    $this->line("      ✅ Deleted from database");
                }
                
                $this->deletedVersions++;
            } else {
                $this->line("   ✅ Version OK: {$version->file_name} (v{$version->version})");
            }
        }
        
        $this->line('');
    }
}
















