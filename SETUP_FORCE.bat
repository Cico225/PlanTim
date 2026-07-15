@echo off
SETLOCAL

echo ============================================
echo PlanTim - Instalacija (Forsirana)
echo ============================================
echo.
echo UPOZORENJE: Ova skripta ignoriše sigurnosna upozorenja!
echo Preporučujemo da što prije ažurirate XAMPP na PHP 8.2+
echo.
pause

REM Set XAMPP paths
SET PHP_PATH=C:\xampp\php\php.exe
SET COMPOSER_PATH=C:\xampp\php\composer.phar
SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

REM Check if PHP exists
if not exist "%PHP_PATH%" (
    echo ERROR: PHP nije pronadjen na: %PHP_PATH%
    echo.
    pause
    EXIT /B 1
)

echo ✓ PHP pronadjen: %PHP_PATH%
echo.

REM Check if Composer exists
if not exist "%COMPOSER_PATH%" (
    echo Composer nije pronadjen. Instaliramo...
    echo.
    powershell -Command "Invoke-WebRequest -Uri 'https://getcomposer.org/installer' -OutFile 'composer-setup.php'"
    "%PHP_PATH%" composer-setup.php --install-dir=C:\xampp\php --filename=composer.phar
    del composer-setup.php
)

echo ✓ Composer pronadjen!
echo.

cd /d "%~dp0"

echo [1/9] Kreiranje backend .env fajla...
echo.

REM Create .env file
(
echo APP_NAME=PlanTim
echo APP_ENV=local
echo APP_KEY=
echo APP_DEBUG=true
echo APP_URL=http://localhost:8000
echo.
echo LOG_CHANNEL=stack
echo LOG_DEPRECATIONS_CHANNEL=null
echo LOG_LEVEL=debug
echo.
echo DB_CONNECTION=mysql
echo DB_HOST=127.0.0.1
echo DB_PORT=3306
echo DB_DATABASE=plantim
echo DB_USERNAME=root
echo DB_PASSWORD=
echo.
echo BROADCAST_DRIVER=log
echo CACHE_DRIVER=file
echo FILESYSTEM_DISK=local
echo QUEUE_CONNECTION=sync
echo SESSION_DRIVER=file
echo SESSION_LIFETIME=120
echo.
echo SANCTUM_STATEFUL_DOMAINS=localhost:5173
echo SESSION_DOMAIN=localhost
) > .env

echo ✓ Backend .env fajl kreiran!
echo.

echo [2/9] Kreiranje frontend .env fajla...
echo.

cd frontend
(
echo VITE_API_URL=http://localhost:8000/api
echo VITE_APP_NAME=PlanTim
) > .env
cd ..

echo ✓ Frontend .env fajl kreiran!
echo.

echo [3/9] Instalacija PHP zavisnosti (forsirana - ignoriše sigurnosna upozorenja^)...
echo ⚠ UPOZORENJE: Preporučujemo ažuriranje XAMPP-a na PHP 8.2+
echo.

"%PHP_PATH%" "%COMPOSER_PATH%" install --no-audit --no-interaction
if %errorlevel% neq 0 (
    echo ERROR: Greška pri instalaciji!
    pause
    EXIT /B 1
)

echo ✓ PHP zavisnosti instalirane!
echo.

echo [4/9] Generisanje APP_KEY...
echo.
"%PHP_PATH%" artisan key:generate

echo [5/9] Provjera MySQL veze...
echo.
if exist "%MYSQL_PATH%" (
    "%MYSQL_PATH%" -u root -e "SELECT 1;" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠ WARNING: MySQL nije aktivan!
        echo Pokrenite MySQL u XAMPP Control Panel-u.
        pause
    )
)

echo [6/9] Kreiranje baze podataka...
echo.
if exist "%MYSQL_PATH%" (
    "%MYSQL_PATH%" -u root -e "CREATE DATABASE IF NOT EXISTS plantim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)

echo [7/9] Pokretanje migracija...
echo.
"%PHP_PATH%" artisan migrate --force

echo [8/9] Dodavanje inicijalnih podataka...
echo.
"%PHP_PATH%" artisan db:seed --force

echo [9/9] Čišćenje cache-a...
echo.
"%PHP_PATH%" artisan config:clear
"%PHP_PATH%" artisan cache:clear
"%PHP_PATH%" artisan route:clear

echo.
echo ============================================
echo ✓ Instalacija završena!
echo ============================================
echo.
echo ⚠ VAŽNO SIGURNOSNO UPOZORENJE:
echo Koristite Laravel 9 sa poznatim sigurnosnim ranjivostima.
echo.
echo PREPORUČUJEMO:
echo 1. Preuzmite noviji XAMPP sa PHP 8.2+
echo 2. Vratite Laravel 10: copy composer.json.backup composer.json
echo 3. Pokrenite ponovo instalaciju
echo.
echo Za sada možete testirati aplikaciju, ali ažurirajte što prije!
echo.
echo PODACI ZA PRIJAVU:
echo Email:    admin@plantim.local
echo Password: password123
echo.
echo Pokrenite: START_ALL_AUTO.bat
echo.
pause
ENDLOCAL

