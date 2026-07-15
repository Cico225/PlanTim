@echo off
echo ========================================
echo PlanTim - Database Setup
echo ========================================
echo.

REM Set XAMPP paths
SET PHP_PATH=C:\xampp\php\php.exe
SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

echo Checking if PHP exists...
if not exist "%PHP_PATH%" (
    echo ERROR: PHP not found at %PHP_PATH%
    echo Please adjust the path in this script.
    pause
    exit /b 1
)

echo PHP found!
echo.

REM Navigate to project
cd /d C:\xampp\htdocs\PlanTim

echo [1/4] Generating Application Key...
%PHP_PATH% artisan key:generate
echo.

echo [2/4] Creating Database Tables (Running Migrations)...
%PHP_PATH% artisan migrate --force
echo.

echo [3/4] Adding Initial Data (Seeders)...
%PHP_PATH% artisan db:seed --force
echo.

echo [4/4] Clearing Cache...
%PHP_PATH% artisan config:clear
%PHP_PATH% artisan cache:clear
echo.

echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo You can now login with:
echo Email: admin@plantim.local
echo Password: password
echo.
echo To start servers, run: START_SERVERS.bat
echo.
pause

