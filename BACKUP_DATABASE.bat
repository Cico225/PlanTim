@echo off
SET PHP_PATH=C:\xampp\php\php.exe
SET MYSQL_PATH=C:\xampp\mysql\bin\mysqldump.exe
SET BACKUP_DIR=backups
SET DB_NAME=plantim
SET DB_USER=root

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set DATE_STR=%datetime:~0,8%_%datetime:~8,6%

echo ========================================
echo    PlanTim Database Backup Tool
echo ========================================
echo.
echo Database: %DB_NAME%
echo Timestamp: %DATE_STR%
echo.

echo [1/3] Creating backup directory...
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo    ✓ Directory created: %BACKUP_DIR%
) else (
    echo    ✓ Directory exists: %BACKUP_DIR%
)

echo.
echo [2/3] Creating database backup...
"%MYSQL_PATH%" -u %DB_USER% %DB_NAME% > "%BACKUP_DIR%\backup_%DATE_STR%.sql" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo    ✓ Backup created successfully!
    echo    ✓ File: %BACKUP_DIR%\backup_%DATE_STR%.sql
    
    REM Get file size
    for %%A in ("%BACKUP_DIR%\backup_%DATE_STR%.sql") do set SIZE=%%~zA
    set /a SIZE_MB=%SIZE% / 1024 / 1024
    echo    ✓ Size: ~%SIZE_MB% MB
) else (
    echo    ✗ ERROR: Failed to create backup!
    echo    Check MySQL connection and credentials.
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying backup file...
if exist "%BACKUP_DIR%\backup_%DATE_STR%.sql" (
    echo    ✓ Backup file exists and is ready!
) else (
    echo    ✗ ERROR: Backup file not found!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Backup completed successfully!
echo ========================================
echo.
echo To restore this backup, run:
echo    RESTORE_DATABASE.bat %BACKUP_DIR%\backup_%DATE_STR%.sql
echo.
pause















