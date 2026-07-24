@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - sinkronizuj verziju iz app/release.json u bazu
REM Koristi na laptopu i serveru nakon pull-a
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET PROJECT_DIR=C:\xampp\htdocs\PlanTim

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo GRESKA: Folder projekta ne postoji: %PROJECT_DIR%
    pause
    exit /b 1
)

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - SYNC APP VERSION
echo ========================================
echo.

"%PHP_PATH%" artisan app:version-sync
if errorlevel 1 (
    echo.
    echo Ako tabela app_versions ne postoji, prvo pokreni:
    echo   php migrate.php
    pause
    exit /b 1
)

echo.
echo Verzija je uspjesno sinkronizovana.
pause
