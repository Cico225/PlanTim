@echo off
SETLOCAL

echo ============================================
echo PlanTim - Automatska Instalacija
echo ============================================
echo.

REM Set XAMPP paths
SET PHP_PATH=C:\xampp\php\php.exe
SET COMPOSER_PATH=C:\xampp\php\composer.phar
SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

REM Check if PHP exists
if not exist "%PHP_PATH%" (
    echo ERROR: PHP nije pronadjen na: %PHP_PATH%
    echo.
    echo Molimo provjerite da li je XAMPP instaliran na C:\xampp\
    echo Ako je XAMPP na drugoj lokaciji, uredite SETUP_AUTO.bat fajl.
    echo.
    pause
    EXIT /B 1
)

echo ✓ PHP pronadjen: %PHP_PATH%
echo.

REM Check if Composer exists
if not exist "%COMPOSER_PATH%" (
    echo.
    echo Composer nije pronadjen. Instaliramo Composer...
    echo.
    
    REM Download Composer installer
    powershell -Command "Invoke-WebRequest -Uri 'https://getcomposer.org/installer' -OutFile 'composer-setup.php'"
    
    REM Install Composer
    "%PHP_PATH%" composer-setup.php --install-dir=C:\xampp\php --filename=composer.phar
    
    REM Clean up
    del composer-setup.php
    
    if not exist "%COMPOSER_PATH%" (
        echo ERROR: Greška pri instalaciji Composer-a!
        pause
        EXIT /B 1
    )
    
    echo ✓ Composer uspješno instaliran!
) else (
    echo ✓ Composer pronadjen: %COMPOSER_PATH%
)

echo.
echo ============================================
echo Početak instalacije...
echo ============================================
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

echo ✓ Backend .env fajl kreiran!
echo.

echo [2/9] Kreiranje frontend .env fajla...
echo.

cd frontend

REM Create frontend .env file
(
echo VITE_API_URL=http://localhost:8000/api
echo VITE_APP_NAME=PlanTim
) > .env

echo ✓ Frontend .env fajl kreiran!
echo.

cd ..

echo [3/9] Instalacija PHP zavisnosti (composer install^)...
echo Ovo može potrajati nekoliko minuta...
echo.

"%PHP_PATH%" "%COMPOSER_PATH%" install --no-interaction
if %errorlevel% neq 0 (
    echo ERROR: Greška pri instalaciji Composer paketa!
    pause
    EXIT /B 1
)

echo ✓ PHP zavisnosti instalirane!
echo.

echo [4/9] Generisanje APP_KEY...
echo.
"%PHP_PATH%" artisan key:generate
if %errorlevel% neq 0 (
    echo ERROR: Greška pri generisanju ključa!
    pause
    EXIT /B 1
)

echo ✓ APP_KEY generisan!
echo.

echo [5/9] Provjera MySQL veze...
echo.

REM Test MySQL connection
if exist "%MYSQL_PATH%" (
    "%MYSQL_PATH%" -u root -e "SELECT 1;" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ MySQL je aktivan!
    ) else (
        echo.
        echo ⚠ WARNING: MySQL nije aktivan!
        echo Molimo pokrenite MySQL u XAMPP Control Panel-u.
        echo.
        echo Pritisnite bilo koju tipku nakon što pokrenete MySQL...
        pause
    )
) else (
    echo ! MySQL putanja nije pronadjena - pretpostavljamo da je aktivan...
)

echo.
echo [6/9] Kreiranje baze podataka (ako ne postoji^)...
echo.

if exist "%MYSQL_PATH%" (
    "%MYSQL_PATH%" -u root -e "CREATE DATABASE IF NOT EXISTS plantim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    if %errorlevel% equ 0 (
        echo ✓ Baza podataka spremna!
    )
) else (
    echo ! Preskačemo kreiranje baze - molimo kreirajte ručno ako ne postoji.
)

echo.
echo [7/9] Pokretanje migracija (kreiranje tabela^)...
echo.

"%PHP_PATH%" artisan migrate --force
if %errorlevel% neq 0 (
    echo.
    echo ⚠ WARNING: Migracije nisu uspjele!
    echo Možda su tabele već kreirane. Nastavljamo...
    echo.
)

echo.
echo [8/9] Dodavanje inicijalnih podataka (admin korisnik^)...
echo.

"%PHP_PATH%" artisan db:seed --force
if %errorlevel% neq 0 (
    echo.
    echo ⚠ WARNING: Seeding nije uspio!
    echo Možda je admin korisnik već kreiran. Nastavljamo...
    echo.
)

echo.
echo [9/9] Čišćenje cache-a...
echo.
"%PHP_PATH%" artisan config:clear
"%PHP_PATH%" artisan cache:clear
"%PHP_PATH%" artisan route:clear
"%PHP_PATH%" artisan view:clear

echo.
echo ============================================
echo ✓✓✓ USPJEŠNO! Instalacija je završena! ✓✓✓
echo ============================================
echo.
echo 📋 PODACI ZA PRIJAVU:
echo    Email:    admin@plantim.local
echo    Password: password123
echo.
echo 🚀 SLJEDEĆI KORAK - Pokrenite servere:
echo.
echo    1. Pokrenite: START_BACKEND_AUTO.bat
echo    2. U drugom terminalu: cd frontend, zatim npm run dev
echo    3. Otvorite browser: http://localhost:5173
echo.
echo ============================================
pause
ENDLOCAL

