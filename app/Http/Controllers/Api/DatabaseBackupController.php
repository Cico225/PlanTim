<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlanTimBackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DatabaseBackupController extends Controller
{
    private $backupDir;
    private $mysqlPath;
    private $mysqldumpPath;

    public function __construct()
    {
        // Check if user has admin or super-admin role
        $this->middleware(function ($request, $next) {
            try {
                $user = auth()->user();
                if (!$user) {
                    return response()->json([
                        'message' => 'Unauthorized. Please log in.',
                    ], 401);
                }
                
                // Check if user has admin role
                $isAdmin = false;
                if (method_exists($user, 'hasAnyRole')) {
                    try {
                        $isAdmin = $user->hasAnyRole(['admin', 'super-admin']);
                    } catch (\Exception $e) {
                        Log::warning('Error checking user role in DatabaseBackup', [
                            'error' => $e->getMessage(),
                            'user_id' => $user->id,
                        ]);
                        // Fallback: check role directly from database
                        $isAdmin = DB::table('users')
                            ->where('id', $user->id)
                            ->whereIn('role', ['admin', 'super-admin'])
                            ->exists();
                    }
                } else {
                    // Fallback: check role directly from database
                    $isAdmin = DB::table('users')
                        ->where('id', $user->id)
                        ->where(function($query) {
                            $query->where('role', 'admin')
                                  ->orWhere('role', 'super-admin');
                        })
                        ->exists();
                }
                
                if (!$isAdmin) {
                    return response()->json([
                        'message' => 'Unauthorized. Admin access required.',
                    ], 403);
                }
                
                return $next($request);
            } catch (\Exception $e) {
                Log::error('Error in DatabaseBackup middleware', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'message' => 'Authorization error. Please try again.',
                ], 500);
            }
        });

        // SQL backup folder u korijenu projekta (backups/)
        $this->backupDir = base_path('backups');

        if (! File::exists($this->backupDir)) {
            File::makeDirectory($this->backupDir, 0755, true);
        }

        // Detect MySQL paths (Windows XAMPP)
        $this->mysqlPath = $this->detectMysqlPath('mysql.exe');
        $this->mysqldumpPath = $this->detectMysqlPath('mysqldump.exe');
    }

    /**
     * Detect MySQL executable path
     */
    private function detectMysqlPath($executable)
    {
        // Common XAMPP paths
        $paths = [
            'C:\\xampp\\mysql\\bin\\' . $executable,
            'C:\\Program Files\\xampp\\mysql\\bin\\' . $executable,
            'C:\\wamp\\bin\\mysql\\mysql8.0.31\\bin\\' . $executable,
            $executable, // Try system PATH
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        // Fallback: try to find in PATH (Windows)
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            try {
                $which = shell_exec("where $executable 2>nul");
                if ($which) {
                    $path = trim(str_replace("\n", "", $which));
                    if (file_exists($path)) {
                        return $path;
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Error finding $executable in PATH", ['error' => $e->getMessage()]);
            }
        } else {
            // Unix/Linux
            try {
                $which = shell_exec("which $executable 2>/dev/null");
                if ($which) {
                    $path = trim($which);
                    if (file_exists($path)) {
                        return $path;
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Error finding $executable in PATH", ['error' => $e->getMessage()]);
            }
        }

        return null;
    }

    /**
     * Get database connection info
     */
    private function getDbConfig()
    {
        $config = config('database.connections.mysql');
        return [
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'username' => $config['username'],
            'password' => $config['password'],
        ];
    }

    /**
     * List all backup files
     */
    public function listBackups()
    {
        try {
            $backups = [];
            $files = File::files($this->backupDir);

            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
                    $backups[] = [
                        'filename' => $file->getFilename(),
                        'size' => $file->getSize(),
                        'size_formatted' => $this->formatBytes($file->getSize()),
                        'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                        'path' => $file->getPathname(),
                    ];
                }
            }

            // Sort by creation time (newest first)
            usort($backups, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            return response()->json([
                'backups' => $backups,
                'backup_dir' => $this->backupDir,
            ]);
        } catch (\Exception $e) {
            Log::error('Error listing backups: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri učitavanju backup fajlova',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new database backup
     */
    public function createBackup(Request $request)
    {
        try {
            $dbConfig = $this->getDbConfig();

            if (!$this->mysqldumpPath) {
                Log::error('mysqldump not found', [
                    'mysql_path' => $this->mysqlPath,
                    'mysqldump_path' => $this->mysqldumpPath,
                    'os' => PHP_OS,
                ]);
                
                return response()->json([
                    'error' => 'mysqldump nije pronađen',
                    'message' => 'mysqldump.exe nije pronađen. Proverite da li je MySQL instaliran i da li je mysqldump.exe dostupan u C:\\xampp\\mysql\\bin\\ ili u sistem PATH-u.',
                    'debug' => [
                        'mysql_path' => $this->mysqlPath,
                        'mysqldump_path' => $this->mysqldumpPath,
                        'os' => PHP_OS,
                        'backup_dir' => $this->backupDir,
                    ],
                ], 500);
            }

            // Generate backup filename with timestamp
            $timestamp = date('Y-m-d_H-i-s');
            $filename = "backup_{$timestamp}.sql";
            $filepath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

            // Ensure directory exists and is writable
            if (!File::isWritable($this->backupDir)) {
                File::chmod($this->backupDir, 0755);
            }

            // Build mysqldump command - prepare arguments array
            $commandArgs = [
                '-h' . $dbConfig['host'],
                '-P' . $dbConfig['port'],
                '-u' . $dbConfig['username'],
            ];

            // Add password if set
            if (!empty($dbConfig['password'])) {
                $commandArgs[] = '--password=' . $dbConfig['password'];
            } else {
                $commandArgs[] = '--password=';
            }

            $commandArgs[] = $dbConfig['database'];
            $commandArgs[] = '--single-transaction';
            $commandArgs[] = '--routines';
            $commandArgs[] = '--triggers';
            $commandArgs[] = '--quick';
            $commandArgs[] = '--lock-tables=false';

            // Build command string for logging (with password hidden)
            $logCommand = $this->mysqldumpPath . ' ' . implode(' ', array_map(function($arg) use ($dbConfig) {
                if (strpos($arg, '--password=') === 0 && !empty($dbConfig['password'])) {
                    return '--password=***';
                }
                return $arg;
            }, $commandArgs));

            Log::info('Executing backup command: ' . $logCommand);

            // Execute backup - use proc_open for better cross-platform compatibility
            $errorLogPath = $filepath . '.error.log';
            $success = false;
            $returnCode = -1;
            $output = [];
            
            try {
                // Use proc_open for better control (works on both Windows and Unix)
                $descriptorspec = [
                    0 => ['pipe', 'r'],  // stdin
                    1 => ['file', $filepath, 'w'],  // stdout -> file
                    2 => ['file', $errorLogPath, 'w'],   // stderr -> error log
                ];
                
                // proc_open on Windows: use array format with proper escaping
                if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                    // Windows: build command as array (executable + arguments)
                    // proc_open on Windows accepts array format: [executable, arg1, arg2, ...]
                    $windowsCommand = array_merge([$this->mysqldumpPath], $commandArgs);
                    Log::info('Windows proc_open command (array): ' . $logCommand);
                    $process = @proc_open($windowsCommand, $descriptorspec, $pipes);
                } else {
                    // Unix/Linux: use array format (more secure)
                    $unixCommand = array_merge([$this->mysqldumpPath], $commandArgs);
                    Log::info('Unix proc_open command (array): ' . $logCommand);
                    $process = @proc_open($unixCommand, $descriptorspec, $pipes);
                }
                
                if (is_resource($process)) {
                    // Close stdin
                    if (isset($pipes[0])) {
                        fclose($pipes[0]);
                    }
                    
                    // Wait for process to complete
                    $returnCode = proc_close($process);
                    $success = ($returnCode === 0);
                    
                    // Check error log
                    if (File::exists($errorLogPath)) {
                        $errorLog = File::get($errorLogPath);
                        if (!empty(trim($errorLog))) {
                            Log::error('Backup stderr output: ' . $errorLog);
                            $output[] = $errorLog;
                        }
                        File::delete($errorLogPath);
                    }
                } else {
                    // Fallback: try exec method
                    Log::warning('proc_open failed, trying exec fallback');
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        // Windows: build command with proper escaping
                        // Quote executable path if it contains spaces
                        $executable = strpos($this->mysqldumpPath, ' ') !== false ? 
                            '"' . $this->mysqldumpPath . '"' : $this->mysqldumpPath;
                        $args = implode(' ', array_map(function($arg) {
                            // Quote arguments with spaces
                            return strpos($arg, ' ') !== false ? '"' . $arg . '"' : $arg;
                        }, $commandArgs));
                        $command = $executable . ' ' . $args . ' > "' . $filepath . '" 2> "' . $errorLogPath . '"';
                    } else {
                        // Unix: use escapeshellarg
                        $executable = escapeshellarg($this->mysqldumpPath);
                        $escapedArgs = array_map('escapeshellarg', $commandArgs);
                        $command = $executable . ' ' . implode(' ', $escapedArgs) . ' > ' . escapeshellarg($filepath) . ' 2> ' . escapeshellarg($errorLogPath);
                    }
                    
                    Log::info('Fallback exec command: ' . $logCommand);
                    exec($command, $output, $returnCode);
                    $success = ($returnCode === 0);
                    
                    // Check error log
                    if (File::exists($errorLogPath)) {
                        $errorLog = File::get($errorLogPath);
                        if (!empty(trim($errorLog))) {
                            Log::error('Backup stderr output: ' . $errorLog);
                            $output[] = $errorLog;
                        }
                        File::delete($errorLogPath);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Error executing backup command', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'os' => PHP_OS,
                ]);
                $returnCode = -1;
                $success = false;
                $output[] = $e->getMessage();
            }

            // Check if file was created
            if (!File::exists($filepath)) {
                $errorOutput = implode("\n", $output);
                Log::error('Backup file not created. Command output: ' . $errorOutput);
                Log::error('Return code: ' . $returnCode);
                Log::error('Command: ' . $logCommand);
                return response()->json([
                    'error' => 'Backup fajl nije kreiran',
                    'message' => $errorOutput ?: 'Nepoznata greška. Proverite logove za detalje.',
                    'debug' => [
                        'return_code' => $returnCode,
                        'command' => $logCommand,
                        'filepath' => $filepath,
                        'backup_dir_exists' => File::exists($this->backupDir),
                        'backup_dir_writable' => File::isWritable($this->backupDir),
                        'mysqldump_path' => $this->mysqldumpPath,
                    ],
                ], 500);
            }

            // Verify backup file is not empty
            $fileSize = File::size($filepath);
            if ($fileSize === 0) {
                File::delete($filepath);
                $errorOutput = implode("\n", $output);
                Log::error('Backup file is empty. Command output: ' . $errorOutput);
                return response()->json([
                    'error' => 'Backup fajl je prazan',
                    'message' => $errorOutput ?: 'Komanda je uspješno izvršena ali fajl je prazan',
                    'debug' => [
                        'return_code' => $returnCode,
                        'output' => $output,
                    ],
                ], 500);
            }

            // Check if file contains actual error messages (not just the word "error" in comments)
            // Valid SQL dumps start with -- comments, so check for actual error patterns
            $fileContent = File::get($filepath);
            $firstChars = substr(trim($fileContent), 0, 200); // Check first 200 chars
            
            // Check for actual error messages (not SQL dump headers)
            $hasRealError = false;
            $errorPatterns = [
                '/Access denied/i',
                '/Unknown database/i',
                '/Can\'t connect to/i',
                '/ERROR \d{4}/i', // MySQL error codes like ERROR 1045
                '/mysqldump: error/i',
            ];
            
            foreach ($errorPatterns as $pattern) {
                if (preg_match($pattern, $fileContent)) {
                    $hasRealError = true;
                    break;
                }
            }
            
            // If file doesn't start with SQL dump header (-- MariaDB dump or -- MySQL dump)
            // and contains error-like content, it's likely an error
            if (!$hasRealError && stripos($firstChars, '-- MariaDB dump') === false && 
                stripos($firstChars, '-- MySQL dump') === false &&
                stripos($firstChars, '-- Dump') === false) {
                // Might be an error message instead of SQL
                if (stripos($fileContent, 'error') !== false && strlen($fileContent) < 500) {
                    // Short file with "error" is likely an error message
                    $hasRealError = true;
                }
            }
            
            if ($hasRealError) {
                $errorOutput = substr($fileContent, 0, 1000); // Limit error output
                File::delete($filepath);
                Log::error('Backup file contains errors: ' . $errorOutput);
                return response()->json([
                    'error' => 'Greška pri kreiranju backup-a',
                    'message' => $errorOutput,
                ], 500);
            }

            // Log activity
            try {
                activity()
                    ->causedBy(auth()->user())
                    ->log('Database backup created: ' . $filename);
            } catch (\Exception $e) {
                // Activity log might fail, but don't fail the backup
                Log::warning('Failed to log activity: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Backup je uspješno kreiran',
                'backup' => [
                    'filename' => $filename,
                    'size' => $fileSize,
                    'size_formatted' => $this->formatBytes($fileSize),
                    'created_at' => date('Y-m-d H:i:s'),
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating backup: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Greška pri kreiranju backup-a',
                'message' => $e->getMessage(),
                'debug' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ],
            ], 500);
        }
    }

    /**
     * Download a backup file
     */
    public function downloadBackup($filename)
    {
        try {
            // Security: prevent directory traversal
            $filename = basename($filename);
            $filepath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

            if (!File::exists($filepath)) {
                return response()->json([
                    'error' => 'Backup fajl nije pronađen',
                ], 404);
            }

            // Log activity
            activity()
                ->causedBy(auth()->user())
                ->log('Database backup downloaded: ' . $filename);

            return response()->download($filepath, $filename, [
                'Content-Type' => 'application/sql',
            ]);
        } catch (\Exception $e) {
            Log::error('Error downloading backup: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri preuzimanju backup-a',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore database from backup file
     */
    public function restoreBackup(Request $request)
    {
        try {
            $request->validate([
                'filename' => 'required|string',
            ]);

            $filename = basename($request->input('filename'));
            $filepath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

            if (!File::exists($filepath)) {
                return response()->json([
                    'error' => 'Backup fajl nije pronađen',
                ], 404);
            }

            $dbConfig = $this->getDbConfig();

            if (!$this->mysqlPath) {
                return response()->json([
                    'error' => 'mysql nije pronađen. Proverite da li je MySQL instaliran.',
                ], 500);
            }

            // Build mysql restore command - Windows compatible
            $commandParts = [
                escapeshellarg($this->mysqlPath),
                '-h' . escapeshellarg($dbConfig['host']),
                '-P' . escapeshellarg($dbConfig['port']),
                '-u' . escapeshellarg($dbConfig['username']),
            ];

            // Add password if set
            if (!empty($dbConfig['password'])) {
                $commandParts[] = '--password=' . escapeshellarg($dbConfig['password']);
            }

            $commandParts[] = escapeshellarg($dbConfig['database']);

            // Build full command with input redirect
            $command = implode(' ', $commandParts) . ' < ' . escapeshellarg($filepath) . ' 2>&1';

            Log::info('Executing restore command: ' . str_replace($dbConfig['password'] ?? '', '***', $command));

            // Execute restore
            $output = [];
            $returnCode = 0;
            
            // On Windows, use cmd /c for proper redirection
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $fullCommand = 'cmd /c ' . $command;
                exec($fullCommand, $output, $returnCode);
            } else {
                exec($command, $output, $returnCode);
            }

            if ($returnCode !== 0) {
                $errorOutput = implode("\n", $output);
                Log::error('Restore failed: ' . $errorOutput);
                Log::error('Return code: ' . $returnCode);
                return response()->json([
                    'error' => 'Greška pri restore-u baze podataka',
                    'message' => $errorOutput ?: 'Nepoznata greška',
                    'debug' => [
                        'return_code' => $returnCode,
                        'output' => $output,
                    ],
                ], 500);
            }

            // Clear Laravel cache after restore
            \Artisan::call('config:clear');
            \Artisan::call('cache:clear');

            // Log activity
            activity()
                ->causedBy(auth()->user())
                ->log('Database restored from backup: ' . $filename);

            return response()->json([
                'message' => 'Baza podataka je uspješno restaurirana',
            ]);
        } catch (\Exception $e) {
            Log::error('Error restoring backup: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri restore-u baze podataka',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload and restore from uploaded file
     */
    public function uploadAndRestore(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:sql|max:102400', // Max 100MB
            ]);

            $file = $request->file('file');
            $filename = 'uploaded_' . date('Y-m-d_H-i-s') . '_' . $file->getClientOriginalName();
            $filepath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

            // Move uploaded file to backup directory
            $file->move($this->backupDir, $filename);

            if (!File::exists($filepath)) {
                return response()->json([
                    'error' => 'Greška pri čuvanju uploadovanog fajla',
                ], 500);
            }

            $dbConfig = $this->getDbConfig();

            if (!$this->mysqlPath) {
                File::delete($filepath);
                return response()->json([
                    'error' => 'mysql nije pronađen. Proverite da li je MySQL instaliran.',
                ], 500);
            }

            // Build mysql restore command - Windows compatible
            $commandParts = [
                escapeshellarg($this->mysqlPath),
                '-h' . escapeshellarg($dbConfig['host']),
                '-P' . escapeshellarg($dbConfig['port']),
                '-u' . escapeshellarg($dbConfig['username']),
            ];

            // Add password if set
            if (!empty($dbConfig['password'])) {
                $commandParts[] = '--password=' . escapeshellarg($dbConfig['password']);
            }

            $commandParts[] = escapeshellarg($dbConfig['database']);

            // Build full command with input redirect
            $command = implode(' ', $commandParts) . ' < ' . escapeshellarg($filepath) . ' 2>&1';

            Log::info('Executing restore from upload command: ' . str_replace($dbConfig['password'] ?? '', '***', $command));

            // Execute restore
            $output = [];
            $returnCode = 0;
            
            // On Windows, use cmd /c for proper redirection
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $fullCommand = 'cmd /c ' . $command;
                exec($fullCommand, $output, $returnCode);
            } else {
                exec($command, $output, $returnCode);
            }

            if ($returnCode !== 0) {
                $errorOutput = implode("\n", $output);
                Log::error('Restore from upload failed: ' . $errorOutput);
                Log::error('Return code: ' . $returnCode);
                File::delete($filepath);
                return response()->json([
                    'error' => 'Greška pri restore-u baze podataka',
                    'message' => $errorOutput ?: 'Nepoznata greška',
                    'debug' => [
                        'return_code' => $returnCode,
                        'output' => $output,
                    ],
                ], 500);
            }

            // Clear Laravel cache after restore
            \Artisan::call('config:clear');
            \Artisan::call('cache:clear');

            // Log activity
            activity()
                ->causedBy(auth()->user())
                ->log('Database restored from uploaded file: ' . $filename);

            return response()->json([
                'message' => 'Baza podataka je uspješno restaurirana iz uploadovanog fajla',
                'backup' => [
                    'filename' => $filename,
                    'size' => File::size($filepath),
                    'size_formatted' => $this->formatBytes(File::size($filepath)),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validaciona greška',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading and restoring: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri upload-u i restore-u',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a backup file
     */
    public function deleteBackup($filename)
    {
        try {
            // Security: prevent directory traversal
            $filename = basename($filename);
            $filepath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

            if (!File::exists($filepath)) {
                return response()->json([
                    'error' => 'Backup fajl nije pronađen',
                ], 404);
            }

            File::delete($filepath);

            // Log activity
            activity()
                ->causedBy(auth()->user())
                ->log('Database backup deleted: ' . $filename);

            return response()->json([
                'message' => 'Backup fajl je uspješno obrisan',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting backup: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri brisanju backup-a',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get backup statistics
     */
    public function getStats()
    {
        try {
            $files = File::files($this->backupDir);
            $totalSize = 0;
            $backupCount = 0;

            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
                    $totalSize += $file->getSize();
                    $backupCount++;
                }
            }

            return response()->json([
                'total_backups' => $backupCount,
                'total_size' => $totalSize,
                'total_size_formatted' => $this->formatBytes($totalSize),
                'backup_dir' => $this->backupDir,
                'backup_dir_exists' => File::exists($this->backupDir),
                'mysql_path' => $this->mysqlPath,
                'mysqldump_path' => $this->mysqldumpPath,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting backup stats: ' . $e->getMessage());
            return response()->json([
                'error' => 'Greška pri učitavanju statistika',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Postavke automatskog punog backupa.
     */
    public function getBackupSettings(PlanTimBackupService $backupService)
    {
        try {
            return response()->json([
                'settings' => $backupService->getSettings(),
                'runs_available' => $backupService->tableExists(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting backup settings: '.$e->getMessage());

            return response()->json([
                'error' => 'Greška pri učitavanju postavki backupa',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Spremi postavke automatskog backupa.
     */
    public function updateBackupSettings(Request $request, PlanTimBackupService $backupService)
    {
        try {
            $request->validate([
                'auto_enabled' => 'nullable|boolean',
                'schedule_frequency' => 'nullable|in:hourly,daily,weekly',
                'schedule_time' => 'nullable|string|max:5',
                'schedule_day' => 'nullable|integer|min:0|max:6',
                'destination_path' => 'nullable|string|max:500',
                'notify_emails' => 'nullable|string|max:1000',
                'keep_destination_count' => 'nullable|integer|min:1|max:100',
            ]);

            $settings = $backupService->saveSettings($request->all());

            try {
                activity()
                    ->causedBy(auth()->user())
                    ->log('Backup settings updated');
            } catch (\Exception $e) {
                Log::warning('Failed to log backup settings activity: '.$e->getMessage());
            }

            return response()->json([
                'message' => 'Postavke backupa su sačuvane',
                'settings' => $settings,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating backup settings: '.$e->getMessage());

            return response()->json([
                'error' => 'Greška pri čuvanju postavki backupa',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Historija punih backupova.
     */
    public function listBackupRuns(PlanTimBackupService $backupService)
    {
        try {
            return response()->json([
                'runs' => $backupService->listRuns(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error listing backup runs: '.$e->getMessage());

            return response()->json([
                'error' => 'Greška pri učitavanju historije backupa',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ručno pokretanje punog backupa (baza + ZIP + kopija).
     */
    public function runFullBackup(PlanTimBackupService $backupService)
    {
        try {
            $result = $backupService->runFullBackup('manual', auth()->id());

            try {
                activity()
                    ->causedBy(auth()->user())
                    ->log('Full PlanTim backup completed: '.$result['zip_filename']);
            } catch (\Exception $e) {
                Log::warning('Failed to log full backup activity: '.$e->getMessage());
            }

            return response()->json([
                'message' => 'Puni backup je uspješno završen',
                'result' => $result,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error running full backup: '.$e->getMessage());

            return response()->json([
                'error' => 'Greška pri punom backupu',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Provjera odredišne lokacije backupa.
     */
    public function testDestination(Request $request, PlanTimBackupService $backupService)
    {
        try {
            $request->validate([
                'destination_path' => 'required|string|max:500',
            ]);

            $path = trim($request->input('destination_path'));
            $backupService->assertDestinationWritable($path);

            $testFile = rtrim(str_replace('/', DIRECTORY_SEPARATOR, $path), DIRECTORY_SEPARATOR)
                .DIRECTORY_SEPARATOR.'.plantim_backup_test_'.uniqid().'.tmp';
            File::put($testFile, 'ok');
            File::delete($testFile);

            return response()->json([
                'message' => 'Odredišna lokacija je dostupna za pisanje',
                'destination_path' => $path,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Odredišna lokacija nije dostupna',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test MySQL connection and mysqldump availability
     */
    public function testConnection()
    {
        try {
            $dbConfig = $this->getDbConfig();
            
            // Test database connection
            try {
                DB::connection()->getPdo();
                $dbConnected = true;
            } catch (\Exception $e) {
                $dbConnected = false;
                $dbError = $e->getMessage();
            }

            // Test mysqldump
            $mysqldumpAvailable = false;
            $mysqldumpTest = null;
            if ($this->mysqldumpPath) {
                // Try to get version
                $testCommand = escapeshellarg($this->mysqldumpPath) . ' --version 2>&1';
                exec($testCommand, $versionOutput, $versionCode);
                $mysqldumpAvailable = ($versionCode === 0);
                $mysqldumpTest = implode("\n", $versionOutput);
            }

            // Test backup directory
            $backupDirWritable = File::isWritable($this->backupDir);
            $backupDirExists = File::exists($this->backupDir);

            return response()->json([
                'database' => [
                    'connected' => $dbConnected,
                    'error' => $dbError ?? null,
                    'host' => $dbConfig['host'],
                    'port' => $dbConfig['port'],
                    'database' => $dbConfig['database'],
                    'username' => $dbConfig['username'],
                    'has_password' => !empty($dbConfig['password']),
                ],
                'mysqldump' => [
                    'available' => $mysqldumpAvailable,
                    'path' => $this->mysqldumpPath,
                    'test_output' => $mysqldumpTest,
                ],
                'backup_directory' => [
                    'path' => $this->backupDir,
                    'exists' => $backupDirExists,
                    'writable' => $backupDirWritable,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

