@echo off
echo ========================================
echo PlanTim - SQL migracije (migrate.php)
echo ========================================
echo.

SET PHP_PATH=C:\xampp\php\php.exe

if not exist "%PHP_PATH%" (
    echo ERROR: PHP nije pronadjen na %PHP_PATH%
    pause
    exit /b 1
)

cd /d "%~dp0"

echo Pokretanje SQL migracija...
"%PHP_PATH%" migrate.php

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo GRESKA: Migracije nisu uspjele.
    pause
    exit /b 1
)

echo.
echo SQL migracije zavrsene.
pause
