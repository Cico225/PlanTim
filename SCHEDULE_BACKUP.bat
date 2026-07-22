@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - Windows Task Scheduler: Laravel scheduler (backup)
REM Pokrenite ovu skriptu svake minute u Task Scheduleru.
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET PROJECT_DIR=C:\xampp\htdocs\PlanTim

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo GRESKA: Folder projekta ne postoji: %PROJECT_DIR%
    exit /b 1
)

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    exit /b 1
)

"%PHP_PATH%" artisan schedule:run >> storage\logs\scheduler.log 2>&1
exit /b 0
