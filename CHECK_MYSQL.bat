@echo off
setlocal EnableExtensions

SET PHP_PATH=C:\xampp\php\php.exe
SET PROJECT_DIR=%~dp0
SET PROJECT_DIR=%PROJECT_DIR:~0,-1%

cd /d "%PROJECT_DIR%"

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - Provjera MySQL kredencijala
echo ========================================
echo.

"%PHP_PATH%" scripts\check-mysql.php
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Provjeri .env na serveru:
    echo   DB_HOST=127.0.0.1
    echo   DB_DATABASE=ime_baze
    echo   DB_USERNAME=root
    echo   DB_PASSWORD=lozinka
    echo.
    echo MySQL mora biti pokrenut u XAMPP Control Panelu.
    pause
    exit /b 1
)

echo.
pause
