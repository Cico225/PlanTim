<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Services\NotificationService;
use App\Services\DocumentTextExtractorService;

class DMSController extends Controller
{
    /**
     * Check if user has DMS module permission
     */
    protected function checkPermission($user, $permission)
    {
        // Admin and manager always have access
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(['admin', 'manager', 'super-admin'])) {
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('DMS: Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }

        // Check user_module_permissions
        if (!Schema::hasTable('user_module_permissions')) {
            return false;
        }

        try {
            $userPermission = DB::table('user_module_permissions')
                ->where('user_id', $user->id)
                ->where('module_name', 'dms')
                ->first();

            if (!$userPermission) {
                return false;
            }

            // Map permission types
            switch ($permission) {
                case 'view':
                case 'read':
                    return $userPermission->can_view || $userPermission->can_read;
                case 'create':
                    return $userPermission->can_create;
                case 'update':
                    return $userPermission->can_update;
                case 'delete':
                    return $userPermission->can_delete;
                default:
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('DMS: Failed to check user permissions', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'permission' => $permission
            ]);
            return false;
        }
    }

    /**
     * Check if user has permission for a specific folder
     * @param $user User object
     * @param $folderId Folder ID
     * @param $permission Permission type: 'view', 'create', 'delete'
     * @return bool
     */
    protected function checkFolderPermission($user, $folderId, $permission)
    {
        // Admin and manager always have access
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(['admin', 'manager', 'super-admin'])) {
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('DMS: Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }

        // Check if folder exists
        $folder = DB::table('dms_folders')->find($folderId);
        if (!$folder) {
            return false;
        }

        // Owner always has full access
        if (Schema::hasColumn('dms_folders', 'owner_id') && isset($folder->owner_id) && $folder->owner_id == $user->id) {
            return true;
        }

        // Check if permissions table exists
        if (!Schema::hasTable('dms_folder_permissions')) {
            // If permissions table doesn't exist, allow access if user has module permission
            return $this->checkPermission($user, $permission);
        }

        try {
            // Get user's role IDs
            $userRoleIds = [];
            if (Schema::hasTable('model_has_roles')) {
                $userRoles = DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $user->id)
                    ->pluck('role_id')
                    ->toArray();
                $userRoleIds = $userRoles;
            }

            // Check folder permissions for user or role
            $folderPermission = DB::table('dms_folder_permissions')
                ->where('folder_id', $folderId)
                ->where(function($query) use ($user, $userRoleIds) {
                    $query->where('user_id', $user->id)
                          ->orWhereIn('role_id', $userRoleIds);
                })
                ->first();

            if (!$folderPermission) {
                // No specific permission set, check module-level permission
                return $this->checkPermission($user, $permission);
            }

            // Map permission types
            switch ($permission) {
                case 'view':
                case 'read':
                    return $folderPermission->can_view ?? false;
                case 'create':
                    return $folderPermission->can_create ?? false;
                case 'delete':
                    return $folderPermission->can_delete ?? false;
                default:
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('DMS: Failed to check folder permissions', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'folder_id' => $folderId,
                'permission' => $permission
            ]);
            return false;
        }
    }

    /**
     * Get folder path recursively (Windows Explorer style)
     */
    protected function getFolderPath($folderId)
    {
        $path = [];
        $currentFolderId = $folderId;

        while ($currentFolderId) {
            $folder = DB::table('dms_folders')->find($currentFolderId);
            if (!$folder) {
                break;
            }
            array_unshift($path, [
                'id' => $folder->id,
                'name' => $folder->name,
            ]);
            $currentFolderId = $folder->parent_folder_id;
        }

        return $path;
    }

    /**
     * Get all subfolders recursively
     */
    protected function getSubfolders($parentId)
    {
        $subfolders = DB::table('dms_folders')
            ->where('parent_folder_id', $parentId)
            ->get();

        $result = [];
        foreach ($subfolders as $folder) {
            $result[] = $folder;
            $children = $this->getSubfolders($folder->id);
            $result = array_merge($result, $children);
        }

        return $result;
    }

    /**
     * Get document versions table name (supports both naming conventions)
     */
    protected function getVersionsTableName()
    {
        // Check document_versions first (for documents table)
        if (Schema::hasTable('document_versions')) {
            return 'document_versions';
        } elseif (Schema::hasTable('dms_document_versions')) {
            // Fallback to dms_document_versions (for dms_documents table)
            return 'dms_document_versions';
        }
        return null;
    }

    /**
     * Get uploaded_by column name for versions table
     */
    protected function getVersionsUploadByColumn($tableName)
    {
        if (!$tableName) return 'uploaded_by_id';
        $columns = Schema::getColumnListing($tableName);
        return in_array('uploaded_by', $columns) ? 'uploaded_by' : 'uploaded_by_id';
    }
    /**
     * Get DMS statistics
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled statistike'], 403);
        }

        $totalDocuments = DB::table('documents')->count();
        $totalSize = DB::table('documents')->sum('size');
        $recentUploads = DB::table('documents')
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        return response()->json([
            'total_documents' => $totalDocuments,
            'total_size' => $totalSize ?? 0,
            'recent_uploads' => $recentUploads,
        ]);
    }

    /**
     * Get all documents with Windows Explorer style hierarchy
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled dokumenata'], 403);
        }

        $folderId = $request->input('folder_id');
        $search = $request->input('search');
        $sortBy = $request->input('sort_by', 'name'); // name, size, date, type
        $sortOrder = $request->input('sort_order', 'asc'); // asc, desc
        $perPage = min((int)$request->input('per_page', 50), 100); // Max 100 per page for performance
        $page = (int)$request->input('page', 1);

        // Build optimized query - select only needed columns
        $query = DB::table('documents')
            ->select(
                'documents.id',
                'documents.name',
                'documents.original_name',
                'documents.mime_type',
                'documents.size',
                'documents.path',
                'documents.folder_id',
                'documents.version',
                'documents.created_at',
                'documents.updated_at',
                'users.name as uploaded_by_name',
                'dms_folders.name as folder_name'
            )
            ->leftJoin('users', 'documents.uploaded_by_id', '=', 'users.id')
            ->leftJoin('dms_folders', 'documents.folder_id', '=', 'dms_folders.id');

        // Filter by folder (Windows Explorer style - show only direct children)
        // This is optimized with index on folder_id
        if ($folderId !== null && $folderId !== '' && $folderId !== '0' && $folderId !== 0) {
            // Specific folder - only direct children (uses index)
            $query->where('documents.folder_id', $folderId);
        } else {
            // Root level - documents without folder (when folder_id is null, empty, or 0)
            $query->whereNull('documents.folder_id');
        }

        // Search across name, original_name, and content_text (full-text search)
        // Optimized: search in indexed columns first
        if ($search) {
            $searchTerm = "%{$search}%";
            $query->where(function($q) use ($searchTerm, $search) {
                // Search in indexed columns first (faster)
                $q->where('documents.name', 'like', $searchTerm)
                  ->orWhere('documents.original_name', 'like', $searchTerm);
                
                // Search in document content if column exists (slower, but necessary)
                if (Schema::hasColumn('documents', 'content_text')) {
                    $q->orWhere('documents.content_text', 'like', $searchTerm);
                }
                
                // Search in tags if exists
                if (Schema::hasColumn('documents', 'tags')) {
                    $q->orWhere('documents.tags', 'like', $searchTerm);
                }
            });
        }

        // Optimized sorting - use indexed columns when possible
        switch ($sortBy) {
            case 'name':
                $query->orderBy('documents.name', $sortOrder);
                break;
            case 'size':
                $query->orderBy('documents.size', $sortOrder);
                break;
            case 'date':
            case 'created_at':
                $query->orderBy('documents.created_at', $sortOrder);
                break;
            case 'type':
                $query->orderBy('documents.mime_type', $sortOrder);
                break;
            case 'modified':
                $query->orderBy('documents.updated_at', $sortOrder);
                break;
            default:
                $query->orderBy('documents.name', $sortOrder);
        }

        // Use efficient pagination
        $documents = $query->paginate($perPage, ['*'], 'page', $page);

        // Optimize: Only add folder path if needed (not for every document in large datasets)
        // For performance, we'll skip this for large result sets
        if ($documents->count() <= 100) {
            $documents->getCollection()->transform(function ($doc) {
                if ($doc->folder_id) {
                    $doc->folder_path = $this->getFolderPath($doc->folder_id);
                } else {
                    $doc->folder_path = [];
                }
                return $doc;
            });
        }

        return response()->json([
            'data' => $documents->items(),
            'current_page' => $documents->currentPage(),
            'last_page' => $documents->lastPage(),
            'per_page' => $documents->perPage(),
            'total' => $documents->total(),
            'from' => $documents->firstItem(),
            'to' => $documents->lastItem(),
        ]);
    }

    /**
     * Upload document with automatic versioning
     */
    public function upload(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu za upload dokumenata'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:51200', // 50MB max
            'folder_id' => 'nullable|exists:dms_folders,id',
            'tags' => 'nullable|array',
            'document_id' => 'nullable|exists:documents,id', // For manual versioning
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $documentName = pathinfo($originalName, PATHINFO_FILENAME);
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        $folderId = $request->input('folder_id');

        // Check folder permission if folder_id is provided
        if ($folderId && Schema::hasTable('dms_folder_permissions')) {
            if (!$this->checkFolderPermission($user, $folderId, 'create')) {
                return response()->json(['message' => 'Nemate dozvolu za kreiranje dokumenata u ovom folderu'], 403);
            }
        }
        
        // Determine storage path based on folder
        $storagePath = 'documents';
        if ($folderId) {
            $folder = DB::table('dms_folders')->find($folderId);
            if ($folder && isset($folder->path) && $folder->path) {
                $storagePath = 'documents/' . $folder->path;
            }
        }

        // Check if this is a manual version update
        if ($request->has('document_id') && $request->input('document_id')) {
            $existingDoc = DB::table('documents')->find($request->input('document_id'));
            
            if ($existingDoc) {
                // Save old version to versions table
                $versionsTable = $this->getVersionsTableName();
                if ($versionsTable) {
                    $uploadByColumn = $this->getVersionsUploadByColumn($versionsTable);
                    $versionData = [
                        'document_id' => $existingDoc->id,
                        'version' => $existingDoc->version ?? 1,
                        'file_name' => $existingDoc->original_name ?? $existingDoc->name,
                        'file_path' => $existingDoc->path,
                        'file_size' => $existingDoc->size,
                        'changes' => $request->input('changes_description', 'Nova verzija'),
                        'created_at' => $existingDoc->updated_at ?? $existingDoc->created_at ?? now(),
                        'updated_at' => $existingDoc->updated_at ?? now(),
                    ];
                    // Set uploaded_by column (could be uploaded_by or uploaded_by_id)
                    if ($uploadByColumn) {
                        $versionData[$uploadByColumn] = $existingDoc->uploaded_by_id ?? $user->id;
                    }
                    
                    try {
                        DB::table($versionsTable)->insert($versionData);
                        Log::info('DMS: Manual version saved', [
                            'document_id' => $existingDoc->id,
                            'version' => $versionData['version'],
                            'table' => $versionsTable
                        ]);
                    } catch (\Exception $e) {
                        Log::error('DMS: Failed to save manual version', [
                    'document_id' => $existingDoc->id,
                            'error' => $e->getMessage(),
                            'table' => $versionsTable
                        ]);
                    }
                }

                // Generate unique filename for new version
                $filename = time() . '_' . Str::slug($documentName) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs($storagePath, $filename, 'public');

                // Prepare update data
                $updateData = [
                    'path' => $path,
                    'size' => $size,
                    'version' => ($existingDoc->version ?? 1) + 1,
                    'uploaded_by_id' => $user->id,
                    'updated_at' => now(),
                ];

                // Extract text content from document for full-text search
                try {
                    $extractor = new DocumentTextExtractorService();
                    $fullPath = storage_path('app/public/' . $path);
                    $extractedText = $extractor->extractText($fullPath, $mimeType, $originalName);
                    
                    if ($extractedText !== null && Schema::hasColumn('documents', 'content_text')) {
                        $updateData['content_text'] = $extractedText;
                    }
                } catch (\Exception $e) {
                    Log::warning('DMS: Failed to extract text from manual version', [
                        'document_id' => $existingDoc->id,
                        'error' => $e->getMessage()
                    ]);
                }

                // Update main document
                DB::table('documents')->where('id', $existingDoc->id)->update($updateData);

                $document = DB::table('documents')->find($existingDoc->id);
                return response()->json([
                    'document' => $document,
                    'message' => 'Nova verzija uspešno otpremljena',
                    'is_new_version' => true,
                ], 201);
            }
        }

        // Check if document with same name exists in the same folder (automatic versioning)
        $existingDoc = DB::table('documents')
            ->where('name', $documentName)
            ->where('folder_id', $folderId)
            ->first();

        if ($existingDoc) {
            // This is automatic versioning - same name in same folder
            // Save current version to versions table
            $versionsTable = $this->getVersionsTableName();
            if ($versionsTable) {
                $uploadByColumn = $this->getVersionsUploadByColumn($versionsTable);
                $versionData = [
                    'document_id' => $existingDoc->id,
                    'version' => $existingDoc->version ?? 1,
                    'file_name' => $existingDoc->original_name ?? $existingDoc->name,
                    'file_path' => $existingDoc->path,
                    'file_size' => $existingDoc->size,
                    'changes' => 'Automatska verzija - dokument sa istim imenom',
                    'created_at' => $existingDoc->updated_at ?? $existingDoc->created_at ?? now(),
                    'updated_at' => $existingDoc->updated_at ?? now(),
                ];
                // Set uploaded_by column (could be uploaded_by or uploaded_by_id)
                if ($uploadByColumn) {
                    $versionData[$uploadByColumn] = $existingDoc->uploaded_by_id ?? $user->id;
                }
                
                try {
                    DB::table($versionsTable)->insert($versionData);
                    Log::info('DMS: Version saved', [
                        'document_id' => $existingDoc->id,
                        'version' => $versionData['version'],
                        'table' => $versionsTable
                    ]);
                } catch (\Exception $e) {
                    Log::error('DMS: Failed to save version', [
                        'document_id' => $existingDoc->id,
                        'error' => $e->getMessage(),
                        'table' => $versionsTable
                    ]);
                }
            }

            // Generate unique filename for new version
            $filename = time() . '_' . Str::slug($documentName) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($storagePath, $filename, 'public');

            // Extract text content from new version
            $updateData = [
                'path' => $path,
                'size' => $size,
                'version' => ($existingDoc->version ?? 1) + 1,
                'uploaded_by_id' => $user->id,
                'updated_at' => now(),
            ];

            // Extract text content from document for full-text search
            try {
                $extractor = new DocumentTextExtractorService();
                $fullPath = storage_path('app/public/' . $path);
                $extractedText = $extractor->extractText($fullPath, $mimeType, $originalName);
                
                if ($extractedText !== null && Schema::hasColumn('documents', 'content_text')) {
                    $updateData['content_text'] = $extractedText;
                }
            } catch (\Exception $e) {
                Log::warning('DMS: Failed to extract text from automatic version', [
                    'document_id' => $existingDoc->id,
                    'error' => $e->getMessage()
                ]);
            }

            // Update existing document with new version
            DB::table('documents')->where('id', $existingDoc->id)->update($updateData);

            $document = DB::table('documents')->find($existingDoc->id);
            return response()->json([
                'document' => $document,
                'message' => 'Dokument sa istim imenom već postoji. Kreirana je nova verzija.',
                'is_new_version' => true,
                'previous_version' => $existingDoc->version ?? 1,
            ], 201);
        }

        // Create new document (first version)
        $filename = time() . '_' . Str::slug($documentName) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($storagePath, $filename, 'public');

        $documentId = DB::table('documents')->insertGetId([
            'name' => $documentName,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'size' => $size,
            'path' => $path,
            'folder_id' => $folderId,
            'version' => 1,
            'uploaded_by_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Store tags if provided
        if ($request->has('tags')) {
            $tags = json_encode($request->input('tags'));
            DB::table('documents')->where('id', $documentId)->update(['tags' => $tags]);
        }

        $document = DB::table('documents')->find($documentId);

        return response()->json([
            'document' => $document,
            'message' => 'Dokument uspešno otpremljen',
            'is_new_version' => false,
        ], 201);
    }

    /**
     * Move document to another folder
     */
    public function moveDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu za premještanje dokumenata'], 403);
        }

        $validator = Validator::make($request->all(), [
            'folder_id' => 'nullable|exists:dms_folders,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $document = DB::table('documents')->find($id);

        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        // Get old and new folder paths
        $oldPath = storage_path('app/public/' . $document->path);
        $newFolderPath = 'documents';
        
        if ($request->input('folder_id')) {
            $folder = DB::table('dms_folders')->find($request->input('folder_id'));
            if ($folder && isset($folder->path) && $folder->path) {
                $newFolderPath = 'documents/' . $folder->path;
            }
        }

        // Generate new file path
        $filename = basename($document->path);
        $newPath = $newFolderPath . '/' . $filename;
        $newFullPath = storage_path('app/public/' . $newPath);

        // Move physical file
        if (file_exists($oldPath)) {
            // Create destination folder if it doesn't exist
            $destDir = dirname($newFullPath);
            if (!file_exists($destDir)) {
                mkdir($destDir, 0755, true);
            }
            
            try {
            rename($oldPath, $newFullPath);
            } catch (\Exception $e) {
                Log::error('DMS: Failed to move file', [
                    'old_path' => $oldPath,
                    'new_path' => $newFullPath,
                    'error' => $e->getMessage()
                ]);
                return response()->json(['message' => 'Greška pri premještanju fajla'], 500);
            }
        }

        // Update database
        DB::table('documents')->where('id', $id)->update([
            'folder_id' => $request->input('folder_id'),
            'path' => $newPath,
            'updated_at' => now(),
        ]);

        $document = DB::table('documents')->find($id);

        return response()->json([
            'document' => $document,
            'message' => 'Dokument uspešno premješten',
        ]);
    }

    /**
     * Get document versions
     */
    public function getVersions(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled verzija'], 403);
        }

        $document = DB::table('documents')->find($id);

        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $versions = [];
        
        // Get versions from document versions table if it exists
        $versionsTable = $this->getVersionsTableName();
        if ($versionsTable) {
            $uploadByColumn = $this->getVersionsUploadByColumn($versionsTable);
            
            try {
                $versions = DB::table($versionsTable)
                    ->select("{$versionsTable}.*", 'users.name as uploaded_by_name')
                    ->leftJoin('users', "{$versionsTable}.{$uploadByColumn}", '=', 'users.id')
                    ->where("{$versionsTable}.document_id", $id)
                    ->orderBy("{$versionsTable}.version", 'desc')
                    ->get()
                    ->toArray();
                
                Log::info('DMS: Versions loaded', [
                    'document_id' => $id,
                    'versions_count' => count($versions),
                    'table' => $versionsTable
                ]);
            } catch (\Exception $e) {
                Log::error('DMS: Failed to load versions', [
                    'document_id' => $id,
                    'error' => $e->getMessage(),
                    'table' => $versionsTable
                ]);
            }
        } else {
            Log::warning('DMS: Versions table not found', ['document_id' => $id]);
        }

        // Add current version
        $currentVersion = [
            'id' => 'current',
            'version' => $document->version ?? 1,
            'file_name' => $document->original_name ?? $document->name,
            'file_path' => $document->path,
            'file_size' => $document->size,
            'uploaded_by_name' => DB::table('users')->where('id', $document->uploaded_by_id)->value('name'),
            'created_at' => $document->updated_at ?? $document->created_at,
            'is_current' => true,
        ];

        return response()->json([
            'current' => $currentVersion,
            'versions' => $versions,
        ]);
    }

    /**
     * Download specific version
     */
    public function downloadVersion(Request $request, $documentId, $versionId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za preuzimanje verzija'], 403);
        }

        $versionsTable = $this->getVersionsTableName();
        if (!$versionsTable) {
            return response()->json(['message' => 'Tabela verzija ne postoji'], 404);
        }

        // versionId can be either the record id or the version number
        // Try to find by id first (for compatibility)
        $version = DB::table($versionsTable)->find($versionId);
        
        // If not found by id, try to find by version number and document_id
        if (!$version || $version->document_id != $documentId) {
            $version = DB::table($versionsTable)
                ->where('document_id', $documentId)
                ->where('version', $versionId)
                ->first();
        }

        if (!$version || $version->document_id != $documentId) {
            Log::warning('DMS: Version not found for download', [
                'document_id' => $documentId,
                'version_id' => $versionId,
                'table' => $versionsTable
            ]);
            return response()->json(['message' => 'Verzija nije pronađena'], 404);
        }

        $document = DB::table('documents')->find($documentId);
        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $filePath = storage_path('app/public/' . $version->file_path);

        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fajl nije pronađen na serveru'], 404);
        }

        return response()->download($filePath, $version->file_name ?? $document->original_name ?? $document->name);
    }

    /**
     * Preview document (inline display for PDFs, images, etc.)
     */
    public function preview(Request $request, $id)
    {
        // Support token query parameter for iframe requests (can't send Bearer token in iframe src)
        $token = $request->query('token') ?? $request->bearerToken();
        
        if ($token) {
            // Validate token and get user
            try {
                $personalAccessToken = PersonalAccessToken::findToken($token);
                if ($personalAccessToken && !$personalAccessToken->expires_at || $personalAccessToken->expires_at > now()) {
                    $user = $personalAccessToken->tokenable;
                } else {
                    $user = null;
                }
            } catch (\Exception $e) {
                Log::warning('DMS Preview: Token validation failed', ['error' => $e->getMessage()]);
                $user = null;
            }
        } else {
            // Fallback to standard Bearer token authentication
            $user = $request->user();
        }
        
        if (!$user) {
            // Return 401 with proper content type for iframe (browser will handle it)
            abort(401, 'Unauthorized');
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled dokumenata'], 403);
        }

        $document = DB::table('documents')->find($id);
        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $filePath = storage_path('app/public/' . $document->path);

        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fajl nije pronađen na serveru'], 404);
        }

        // Return file with inline disposition for preview in browser
        return response()->file($filePath, [
            'Content-Type' => $document->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($document->original_name ?? $document->name) . '"',
        ]);
    }

    /**
     * Download document
     */
    public function download(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za preuzimanje dokumenata'], 403);
        }

        $document = DB::table('documents')->find($id);

        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $filePath = storage_path('app/public/' . $document->path);

        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fajl nije pronađen na serveru'], 404);
        }

        return response()->download($filePath, $document->original_name ?? $document->name);
    }

    /**
     * Get preview URL for document (public URL for external viewers like Office Online)
     */
    public function getPreviewUrl(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled dokumenata'], 403);
        }

        $document = DB::table('documents')->find($id);
        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        // Create or get existing share link for preview
        if (Schema::hasTable('dms_share_links')) {
            // Check if there's an existing active share link for this document (without expiry or not expired)
            $existingLink = DB::table('dms_share_links')
                ->where('document_id', $id)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->first();

            if ($existingLink) {
                // Check if is_active column exists, if not, assume link is active
                if (Schema::hasColumn('dms_share_links', 'is_active')) {
                    if (!$existingLink->is_active) {
                        $existingLink = null; // Link exists but is inactive, create new one
                    }
                }
            }

            if ($existingLink) {
                $url = url('/api/dms/share/' . $existingLink->token);
            } else {
                // Create temporary share link (24 hour expiry)
                $token = Str::random(32);
                $shareLinkData = [
                    'document_id' => $id,
                    'token' => $token,
                    'expires_at' => now()->addHours(24),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // Add optional columns if they exist
                if (Schema::hasColumn('dms_share_links', 'is_active')) {
                    $shareLinkData['is_active'] = true;
                }
                if (Schema::hasColumn('dms_share_links', 'created_by')) {
                    $shareLinkData['created_by'] = $user->id;
                }

                DB::table('dms_share_links')->insert($shareLinkData);
                $url = url('/api/dms/share/' . $token);
            }
        } else {
            // Fallback: use download endpoint (may not work for external viewers)
            $token = $request->bearerToken() ?? '';
            $url = url('/api/dms/documents/' . $id . '/download') . '?token=' . $token;
        }

        return response()->json(['preview_url' => $url]);
    }

    /**
     * Delete document
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje dokumenata'], 403);
        }

        $document = DB::table('documents')->find($id);

        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        // Delete file from storage
        try {
        Storage::disk('public')->delete($document->path);
        } catch (\Exception $e) {
            Log::warning('DMS: Failed to delete file from storage', [
                'path' => $document->path,
                'error' => $e->getMessage()
            ]);
        }

        // Delete versions if table exists
        $versionsTable = $this->getVersionsTableName();
        if ($versionsTable) {
            DB::table($versionsTable)->where('document_id', $id)->delete();
        }

        // Delete from database
        DB::table('documents')->where('id', $id)->delete();

        return response()->json(['message' => 'Dokument uspešno obrisan']);
    }

    // ==================== FOLDERS ====================

    /**
     * Get all folders with Windows Explorer style hierarchy
     */
    public function getFolders(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled foldera'], 403);
        }

        $parentId = $request->input('parent_id');
        $folderId = $request->input('folder_id'); // For getting single folder info

        // If folder_id is provided, return single folder with path
        if ($folderId) {
            $folder = DB::table('dms_folders')->find($folderId);
            if (!$folder) {
                return response()->json(['message' => 'Folder nije pronađen'], 404);
            }

            // Check folder permission
            if (Schema::hasTable('dms_folder_permissions')) {
                if (!$this->checkFolderPermission($user, $folderId, 'view')) {
                    return response()->json(['message' => 'Nemate dozvolu za pregled ovog foldera'], 403);
                }
            }

            $folderData = (array) $folder;
            $folderData['folder_path'] = $this->getFolderPath($folderId);
            $folderData['breadcrumb'] = array_map(function($item) {
                return $item['name'];
            }, $folderData['folder_path']);

            // Add counts
            $folderData['documents_count'] = DB::table('documents')->where('folder_id', $folderId)->count();
            $folderData['subfolders_count'] = DB::table('dms_folders')->where('parent_folder_id', $folderId)->count();

            return response()->json($folderData);
        }

        // Build query for listing folders
        $query = DB::table('dms_folders')
            ->select('dms_folders.*')
            ->selectRaw('(SELECT COUNT(*) FROM documents WHERE documents.folder_id = dms_folders.id) as documents_count')
            ->selectRaw('(SELECT COUNT(*) FROM dms_folders as sub WHERE sub.parent_folder_id = dms_folders.id) as subfolders_count');

        // Windows Explorer style - show only direct children
        // Normalize parentId - convert empty string or '0' to null
        if ($parentId === '' || $parentId === '0' || $parentId === 0) {
            $parentId = null;
        }
        
        if ($parentId !== null) {
            // Specific parent - only direct children
            $query->where('dms_folders.parent_folder_id', $parentId);
        } else {
            // Root level - folders without parent (when parent_id is null, empty, or 0)
            $query->whereNull('dms_folders.parent_folder_id');
        }

        $query->orderBy('dms_folders.name', 'asc');

        $folders = $query->get();

        // Filter folders by permissions if permissions table exists
        if (Schema::hasTable('dms_folder_permissions')) {
            $folders = $folders->filter(function ($folder) use ($user) {
                return $this->checkFolderPermission($user, $folder->id, 'view');
            })->values();
        }

        // Optimize: Only add folder path for smaller result sets
        // For large folder lists, skip path calculation for performance
        if ($folders->count() <= 200) {
            $folders->transform(function ($folder) {
                $folder->folder_path = $this->getFolderPath($folder->id);
                $folder->breadcrumb = array_map(function($item) {
                    return $item['name'];
                }, $folder->folder_path);
                return $folder;
            });
        }

        return response()->json($folders);
    }

    /**
     * Get folder tree (full hierarchy for tree view)
     */
    public function getFolderTree(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled foldera'], 403);
        }

        // Get all folders
        $allFolders = DB::table('dms_folders')
            ->select('dms_folders.*')
            ->selectRaw('(SELECT COUNT(*) FROM documents WHERE documents.folder_id = dms_folders.id) as documents_count')
            ->selectRaw('(SELECT COUNT(*) FROM dms_folders as sub WHERE sub.parent_folder_id = dms_folders.id) as subfolders_count')
            ->orderBy('dms_folders.name', 'asc')
            ->get();

        // Build tree structure
        $tree = [];
        $foldersById = [];

        // First pass: create folder objects
        foreach ($allFolders as $folder) {
            $foldersById[$folder->id] = (array)$folder;
            $foldersById[$folder->id]['children'] = [];
        }

        // Second pass: build tree
        foreach ($allFolders as $folder) {
            if ($folder->parent_folder_id && isset($foldersById[$folder->parent_folder_id])) {
                $foldersById[$folder->parent_folder_id]['children'][] = &$foldersById[$folder->id];
            } else {
                $tree[] = &$foldersById[$folder->id];
            }
        }

        return response()->json($tree);
    }

    /**
     * Create folder (supports nested folders)
     */
    public function createFolder(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu za kreiranje foldera'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'parent_folder_id' => 'nullable',
            'permissions' => 'nullable|array',
            'permissions.*.user_id' => 'nullable|exists:users,id',
            'permissions.*.role_id' => 'nullable|exists:roles,id',
            'permissions.*.can_view' => 'nullable|boolean',
            'permissions.*.can_create' => 'nullable|boolean',
            'permissions.*.can_delete' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $name = $request->input('name');
        $parentId = $request->input('parent_folder_id');

        // Normalize parentId - convert empty string or '0' to null
        if ($parentId === '' || $parentId === '0' || $parentId === 0 || $parentId === 'null') {
            $parentId = null;
        }

        // Validate parent folder exists if provided
        if ($parentId !== null && $parentId !== '') {
            $parentExists = DB::table('dms_folders')->where('id', $parentId)->exists();
            if (!$parentExists) {
                return response()->json([
                    'message' => 'Parent folder nije pronađen',
                    'errors' => ['parent_folder_id' => ['Parent folder ne postoji']]
                ], 422);
            }
        }

        // Check if folder with same name exists in parent
        $existingFolderQuery = DB::table('dms_folders')->where('name', $name);
        if ($parentId === null) {
            $existingFolderQuery->whereNull('parent_folder_id');
        } else {
            $existingFolderQuery->where('parent_folder_id', $parentId);
        }
        $existingFolder = $existingFolderQuery->first();

        if ($existingFolder) {
            return response()->json([
                'message' => 'Folder sa istim imenom već postoji u ovom direktorijumu',
                'errors' => ['name' => ['Folder sa ovim imenom već postoji']]
            ], 422);
        }

        // Generate path (relative path in database)
        $path = Str::slug($name);
        $physicalPath = 'documents/' . $path;
        
        if ($parentId) {
            $parent = DB::table('dms_folders')->find($parentId);
            if ($parent && isset($parent->path) && $parent->path) {
                $path = $parent->path . '/' . Str::slug($name);
                $physicalPath = 'documents/' . str_replace('/', DIRECTORY_SEPARATOR, $path);
            }
        }

        // Create physical folder
        $fullPath = storage_path('app/public/' . $physicalPath);
        if (!file_exists($fullPath)) {
            mkdir($fullPath, 0755, true);
        }

        // Prepare folder data - check which columns exist
        $folderData = [
            'name' => $name,
            'parent_folder_id' => $parentId,
            'path' => $path,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // Add owner_id only if column exists
        if (Schema::hasColumn('dms_folders', 'owner_id')) {
            $folderData['owner_id'] = $user->id;
        }

        $folderId = DB::table('dms_folders')->insertGetId($folderData);

        // Save folder permissions if provided
        if ($request->has('permissions') && is_array($request->input('permissions')) && Schema::hasTable('dms_folder_permissions')) {
            foreach ($request->input('permissions') as $permission) {
                // Ensure either user_id or role_id is set, not both
                if (empty($permission['user_id']) && empty($permission['role_id'])) {
                    continue;
                }
                if (!empty($permission['user_id']) && !empty($permission['role_id'])) {
                    continue; // Skip if both are set
                }

                DB::table('dms_folder_permissions')->insert([
                    'folder_id' => $folderId,
                    'user_id' => $permission['user_id'] ?? null,
                    'role_id' => $permission['role_id'] ?? null,
                    'can_view' => $permission['can_view'] ?? false,
                    'can_create' => $permission['can_create'] ?? false,
                    'can_delete' => $permission['can_delete'] ?? false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $folder = DB::table('dms_folders')->find($folderId);
        $folder->folder_path = $this->getFolderPath($folderId);

        return response()->json($folder, 201);
    }

    /**
     * Delete folder
     */
    public function deleteFolder(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje foldera'], 403);
        }

        $folder = DB::table('dms_folders')->find($id);

        if (!$folder) {
            return response()->json(['message' => 'Folder nije pronađen'], 404);
        }

        // Check folder-specific permission if permissions table exists
        if (Schema::hasTable('dms_folder_permissions')) {
            if (!$this->checkFolderPermission($user, $id, 'delete')) {
                return response()->json(['message' => 'Nemate dozvolu za brisanje ovog foldera'], 403);
            }
        }

        // Check if folder has documents
        $documentsCount = DB::table('documents')->where('folder_id', $id)->count();
        
        // Check if folder has subfolders (recursively)
        $subfolders = $this->getSubfolders($id);
        $subfoldersCount = count($subfolders);

        if ($documentsCount > 0 || $subfoldersCount > 0) {
            return response()->json([
                'message' => 'Folder nije prazan. Molimo prvo obrišite sve dokumente i podfoldere.',
                'documents_count' => $documentsCount,
                'subfolders_count' => $subfoldersCount,
            ], 422);
        }

        // Delete physical folder
        if (isset($folder->path) && $folder->path) {
        $physicalPath = storage_path('app/public/documents/' . str_replace('/', DIRECTORY_SEPARATOR, $folder->path));
        if (file_exists($physicalPath)) {
                try {
            rmdir($physicalPath);
                } catch (\Exception $e) {
                    Log::warning('DMS: Failed to delete physical folder', [
                        'path' => $physicalPath,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        // Delete from database
        DB::table('dms_folders')->where('id', $id)->delete();

        return response()->json(['message' => 'Folder uspešno obrisan']);
    }

    /**
     * Get users and roles for folder permissions
     */
    public function getUsersAndRoles(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        try {
            // Get all active users
            $users = DB::table('users')
                ->select('id', 'name', 'email')
                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get();

            // Get all roles
            $roles = collect([]);
            if (Schema::hasTable('roles')) {
                $hasDisplayName = Schema::hasColumn('roles', 'display_name');
                $selectColumns = $hasDisplayName 
                    ? ['id', 'name', 'display_name'] 
                    : ['id', 'name'];
                
                $rolesQuery = DB::table('roles')->select($selectColumns);
                
                if ($hasDisplayName) {
                    $rolesQuery->orderBy('display_name', 'asc');
                } else {
                    $rolesQuery->orderBy('name', 'asc');
                }
                
                $roles = $rolesQuery->get()->map(function ($role) use ($hasDisplayName) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'display_name' => $hasDisplayName ? ($role->display_name ?? $role->name) : $role->name,
                    ];
                });
            }

            return response()->json([
                'users' => $users,
                'roles' => $roles->values()->all(),
            ]);
        } catch (\Exception $e) {
            Log::error('DMS: Failed to get users and roles', [
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Greška pri dobijanju korisnika i uloga'], 500);
        }
    }

    /**
     * Get folder permissions
     */
    public function getFolderPermissions(Request $request, $folderId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('dms_folder_permissions')) {
            return response()->json(['permissions' => []]);
        }

        try {
            $permissions = DB::table('dms_folder_permissions')
                ->where('folder_id', $folderId)
                ->leftJoin('users', 'dms_folder_permissions.user_id', '=', 'users.id')
                ->leftJoin('roles', 'dms_folder_permissions.role_id', '=', 'roles.id')
                ->select(
                    'dms_folder_permissions.*',
                    'users.name as user_name',
                    'users.email as user_email',
                    'roles.name as role_name',
                    DB::raw('CASE WHEN roles.display_name IS NOT NULL THEN roles.display_name ELSE roles.name END as role_display_name')
                )
                ->get()
                ->map(function ($perm) {
                    return [
                        'id' => $perm->id,
                        'user_id' => $perm->user_id,
                        'role_id' => $perm->role_id,
                        'user_name' => $perm->user_name,
                        'user_email' => $perm->user_email,
                        'role_name' => $perm->role_name,
                        'role_display_name' => $perm->role_display_name,
                        'can_view' => (bool)$perm->can_view,
                        'can_create' => (bool)$perm->can_create,
                        'can_delete' => (bool)$perm->can_delete,
                    ];
                });

            return response()->json(['permissions' => $permissions]);
        } catch (\Exception $e) {
            Log::error('DMS: Failed to get folder permissions', [
                'error' => $e->getMessage(),
                'folder_id' => $folderId
            ]);
            return response()->json(['message' => 'Greška pri dobijanju permissions'], 500);
        }
    }

    /**
     * Send document via email
     */
    public function sendDocumentEmail(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za slanje dokumenata'], 403);
        }

        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $document = DB::table('documents')->find($id);
        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $filePath = storage_path('app/public/' . $document->path);
        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fajl nije pronađen na serveru'], 404);
        }

        try {
            // Get sender info
            $senderName = $user->name ?? 'PlanTim';
            $senderEmail = $user->email ?? config('mail.from.address');

            // Prepare email data
            $emailTo = $request->input('email');
            $subject = $request->input('subject') ?? "Dokument: {$document->original_name}";
            $messageText = $request->input('message') ?? "U prilogu vam šaljemo dokument: {$document->original_name}";

            // Send email using Laravel Mail
            try {
                Mail::send([], [], function ($message) use ($emailTo, $subject, $messageText, $filePath, $document, $senderName, $senderEmail) {
                    $message->to($emailTo)
                        ->subject($subject)
                        ->from($senderEmail, $senderName)
                        ->html(nl2br(e($messageText)))
                        ->attach($filePath, [
                            'as' => $document->original_name,
                            'mime' => $document->mime_type ?? 'application/octet-stream',
                        ]);
                });
            } catch (\Exception $mailException) {
                // Fallback: Use PHP mail() function if Laravel Mail fails
                Log::warning('DMS: Laravel Mail failed, using PHP mail() fallback', [
                    'error' => $mailException->getMessage()
                ]);
                
                $headers = "From: {$senderName} <{$senderEmail}>\r\n";
                $headers .= "Reply-To: {$senderEmail}\r\n";
                $headers .= "MIME-Version: 1.0\r\n";
                
                $boundary = md5(time());
                $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
                
                $body = "--{$boundary}\r\n";
                $body .= "Content-Type: text/html; charset=UTF-8\r\n";
                $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
                $body .= nl2br(e($messageText)) . "\r\n";
                $body .= "--{$boundary}\r\n";
                
                $fileContent = file_get_contents($filePath);
                $fileEncoded = chunk_split(base64_encode($fileContent));
                $body .= "Content-Type: {$document->mime_type}; name=\"{$document->original_name}\"\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n";
                $body .= "Content-Disposition: attachment; filename=\"{$document->original_name}\"\r\n\r\n";
                $body .= $fileEncoded . "\r\n";
                $body .= "--{$boundary}--";
                
                if (!mail($emailTo, $subject, $body, $headers)) {
                    throw new \Exception('PHP mail() function failed');
                }
            }

            return response()->json(['message' => 'Email uspešno poslan']);
        } catch (\Exception $e) {
            Log::error('DMS: Failed to send document email', [
                'error' => $e->getMessage(),
                'document_id' => $id,
                'email' => $request->input('email'),
            ]);
            return response()->json(['message' => 'Greška pri slanju email-a: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Create share link
     */
    public function createShareLink(Request $request, $documentId)
    {
        $validator = Validator::make($request->all(), [
            'expires_at' => 'nullable|date|after:now',
            'password' => 'nullable|string|min:4',
            'max_downloads' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $token = Str::random(32);

        $shareLinkId = DB::table('dms_share_links')->insertGetId([
            'document_id' => $documentId,
            'token' => $token,
            'expires_at' => $request->input('expires_at'),
            'password' => $request->has('password') ? bcrypt($request->input('password')) : null,
            'max_downloads' => $request->input('max_downloads'),
            'downloads_count' => 0,
            'created_at' => now(),
        ]);

        $shareLink = DB::table('dms_share_links')->find($shareLinkId);

        return response()->json([
            'share_link' => $shareLink,
            'url' => url('/api/dms/share/' . $token),
        ], 201);
    }

    /**
     * Access shared document via token (public endpoint for Office Online Viewer)
     */
    public function accessSharedDocument(Request $request, $token)
    {
        if (!Schema::hasTable('dms_share_links')) {
            return response()->json(['message' => 'Share link nije pronađen'], 404);
        }

        $shareLinkQuery = DB::table('dms_share_links')
            ->where('token', $token);
        
        // Only check is_active if column exists
        if (Schema::hasColumn('dms_share_links', 'is_active')) {
            $shareLinkQuery->where('is_active', true);
        }
        
        $shareLink = $shareLinkQuery->first();

        if (!$shareLink) {
            return response()->json(['message' => 'Share link nije pronađen ili je istekao'], 404);
        }

        // Check expiry
        if ($shareLink->expires_at && now() > $shareLink->expires_at) {
            return response()->json(['message' => 'Share link je istekao'], 410);
        }

        // Check max downloads
        if ($shareLink->max_downloads && $shareLink->downloads_count >= $shareLink->max_downloads) {
            return response()->json(['message' => 'Dostignut je maksimalan broj preuzimanja'], 403);
        }

        // Check password if set
        if ($shareLink->password) {
            $password = $request->input('password');
            if (!$password || !Hash::check($password, $shareLink->password)) {
                return response()->json(['message' => 'Neispravna lozinka'], 401);
            }
        }

        $document = DB::table('documents')->find($shareLink->document_id);
        if (!$document) {
            return response()->json(['message' => 'Dokument nije pronađen'], 404);
        }

        $filePath = storage_path('app/public/' . $document->path);
        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fajl nije pronađen na serveru'], 404);
        }

        // Increment download count
        DB::table('dms_share_links')
            ->where('id', $shareLink->id)
            ->increment('downloads_count');

        // Return file with proper headers for Office Online Viewer
        return response()->file($filePath, [
            'Content-Type' => $document->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($document->original_name ?? $document->name) . '"',
        ]);
    }
}

