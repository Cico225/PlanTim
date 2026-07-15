@echo off
SETLOCAL

echo ============================================
echo PlanTim Backend Server
echo ============================================
echo.

REM Set XAMPP PHP path
SET PHP_PATH=C:\xampp\php\php.exe

REM Check if PHP exists
if not exist "%PHP_PATH%" (
    echo ERROR: PHP nije pronadjen na: %PHP_PATH%
    echo.
    echo Molimo provjerite da li je XAMPP instaliran na C:\xampp\
    echo.
    pause
    EXIT /B 1
)

echo ✓ Pokrećem Laravel backend server...
echo.
echo Backend Server: http://localhost:8000
echo API Endpoint:   http://localhost:8000/api
echo.
echo Pritisnite Ctrl+C da zaustavite server.
echo ============================================
echo.

cd /d "%~dp0"
"%PHP_PATH%" artisan serve

ENDLOCAL

