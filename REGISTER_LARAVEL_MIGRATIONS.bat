@echo off
echo ========================================
echo PlanTim - Registracija Laravel migracija
echo (jednokratno na serveru nakon importa baze)
echo ========================================
echo.

SET PHP_PATH=C:\xampp\php\php.exe
cd /d "%~dp0"

"%PHP_PATH%" scripts\register-laravel-migrations.php
if errorlevel 1 (
    echo GRESKA.
    pause
    exit /b 1
)

echo.
echo Provjera...
"%PHP_PATH%" artisan migrate:status
echo.
pause
