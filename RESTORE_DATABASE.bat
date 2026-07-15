@echo off
SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
SET DB_NAME=plantim
SET DB_USER=root

REM Check if backup file is provided
if "%~1"=="" (
    echo ========================================
    echo    PlanTim Database Restore Tool
    echo ========================================
    echo.
    echo ERROR: No backup file specified!
    echo.
    echo Usage:
    echo    RESTORE_DATABASE.bat path\to\backup.sql
    echo.
    echo Example:
    echo    RESTORE_DATABASE.bat backups\backup_20241117_143022.sql
    echo.
    pause
    exit /b 1
)

SET BACKUP_FILE=%~1

REM Check if backup file exists
if not exist "%BACKUP_FILE%" (
    echo ========================================
    echo    PlanTim Database Restore Tool
    echo ========================================
    echo.
    echo ERROR: Backup file not found!
    echo    File: %BACKUP_FILE%
    echo.
    pause
    exit /b 1
)

echo ========================================
echo    PlanTim Database Restore Tool
echo ========================================
echo.
echo WARNING: This will REPLACE all data in the database!
echo.
echo Database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo.
echo Are you sure you want to continue? (Y/N)
set /p CONFIRM=

if /i not "%CONFIRM%"=="Y" (
    echo.
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo [1/2] Restoring database...
"%MYSQL_PATH%" -u %DB_USER% %DB_NAME% < "%BACKUP_FILE%" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo    ✓ Database restored successfully!
) else (
    echo    ✗ ERROR: Failed to restore database!
    echo    Check MySQL connection and credentials.
    pause
    exit /b 1
)

echo.
echo [2/2] Clearing Laravel cache...
cd /d C:\xampp\htdocs\PlanTim
C:\xampp\php\php.exe artisan config:clear >nul 2>&1
C:\xampp\php\php.exe artisan cache:clear >nul 2>&1
echo    ✓ Cache cleared!

echo.
echo ========================================
echo    Restore completed successfully!
echo ========================================
echo.
pause















