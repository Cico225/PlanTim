@echo off
SETLOCAL

echo ============================================
echo PlanTim - Kreiranje .env i instalacija
echo ============================================
echo.

REM Check if PHP is accessible
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP nije pronadjen u PATH!
    echo Molimo dodajte C:\xampp\php u PATH.
    echo.
    pause
    EXIT /B 1
)

REM Check if Composer is accessible
where composer >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Composer nije pronadjen!
    echo Instalirajte sa: https://getcomposer.org/download/
    echo.
    pause
    EXIT /B 1
)

cd /d "%~dp0"

echo.
echo [1/7] Kreiranje .env fajla...
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
echo MEMCACHED_HOST=127.0.0.1
echo.
echo REDIS_HOST=127.0.0.1
echo REDIS_PASSWORD=null
echo REDIS_PORT=6379
echo.
echo MAIL_MAILER=smtp
echo MAIL_HOST=mailpit
echo MAIL_PORT=1025
echo MAIL_USERNAME=null
echo MAIL_PASSWORD=null
echo MAIL_ENCRYPTION=null
echo MAIL_FROM_ADDRESS="hello@plantim.local"
echo MAIL_FROM_NAME="${APP_NAME}"
echo.
echo SANCTUM_STATEFUL_DOMAINS=localhost:5173
echo SESSION_DOMAIN=localhost
) > .env

echo ✓ .env fajl kreiran!
echo.

echo [2/7] Instalacija PHP zavisnosti (composer install^)...
echo Ovo može potrajati nekoliko minuta...
echo.
composer install --no-interaction || (
    echo ERROR: Greska pri instalaciji Composer paketa!
    pause
    EXIT /B 1
)

echo.
echo [3/7] Generisanje APP_KEY...
echo.
php artisan key:generate || (
    echo ERROR: Greska pri generisanju kljuca!
    pause
    EXIT /B 1
)

echo.
echo [4/7] Kreiranje baze podataka (ako ne postoji^)...
echo.
mysql -u root -e "CREATE DATABASE IF NOT EXISTS plantim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Baza podataka kreirana ili već postoji!
) else (
    echo ! MySQL komanda nije uspjela - možda je baza već kreirana.
)

echo.
echo [5/7] Pokretanje migracija (kreiranje tabela^)...
echo.
php artisan migrate --force || (
    echo ERROR: Greska pri migracijama!
    pause
    EXIT /B 1
)

echo.
echo [6/7] Dodavanje inicijalnih podataka (admin korisnik^)...
echo.
php artisan db:seed --force || (
    echo ERROR: Greska pri seedovanju!
    pause
    EXIT /B 1
)

echo.
echo [7/7] Čišćenje cache-a...
echo.
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo.
echo ============================================
echo ✓ USPJEŠNO! Instalacija je završena!
echo ============================================
echo.
echo PODACI ZA PRIJAVU:
echo   Email: admin@plantim.local
echo   Password: password123
echo.
echo SLJEDEĆI KORAK:
echo   1. Pokrenite backend: START_BACKEND.bat
echo   2. Pokrenite frontend: cd frontend, zatim npm run dev
echo   3. Otvorite browser: http://localhost:5173
echo.
pause
ENDLOCAL

