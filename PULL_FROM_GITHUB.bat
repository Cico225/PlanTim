@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - SERVER: povuci verziju s GitHuba (main) + deploy
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET GIT_PATH=C:\Program Files\Git\bin\git.exe
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

if not exist "%GIT_PATH%" (
    echo GRESKA: Git nije pronadjen: %GIT_PATH%
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - PULL s GitHuba (main)
echo ========================================
echo Folder: %PROJECT_DIR%
echo.

echo [1/7] Git fetch i pull...

if exist "TRENUTNA_IP_ADRESA.txt" (
    copy /Y "TRENUTNA_IP_ADRESA.txt" "TRENUTNA_IP_ADRESA.txt.bak" >nul
)

"%GIT_PATH%" fetch origin
if errorlevel 1 (
    echo GRESKA: git fetch nije uspio.
    pause
    exit /b 1
)

"%GIT_PATH%" checkout main
if errorlevel 1 (
    echo GRESKA: git checkout main nije uspio.
    pause
    exit /b 1
)

REM Ukloni rucno kopirane duplikate (ne diraj ovu skriptu dok radi)
for %%F in (
    "CHECK_MYSQL.bat"
    "CHECK_PHP_EXTENSIONS.bat"
    "ENABLE_GD_EXTENSION.bat"
    "ENABLE_PHP_EXTENSIONS.bat"
    "INSTALL_COMPOSER.bat"
    "PUSH_TO_GITHUB.bat"
) do if exist %%F del /F /Q %%F 2>nul

"%GIT_PATH%" reset --hard HEAD
"%GIT_PATH%" pull origin main
if errorlevel 1 (
    echo GRESKA: git pull nije uspio.
    pause
    exit /b 1
)

if exist "TRENUTNA_IP_ADRESA.txt.bak" (
    copy /Y "TRENUTNA_IP_ADRESA.txt.bak" "TRENUTNA_IP_ADRESA.txt" >nul
    del /F /Q "TRENUTNA_IP_ADRESA.txt.bak" 2>nul
)

echo Git pull zavrsen.

echo.
echo [2/7] Backup baze...
if exist "scripts\backup-database.php" (
    "%PHP_PATH%" scripts\backup-database.php
) else (
    echo scripts\backup-database.php nije pronadjen, koristim mysqldump...
    if not exist "backups" mkdir "backups"
    "C:\xampp\mysql\bin\mysqldump.exe" -u root plantim > "backups\backup_manual_%date:~-4,4%%date:~-7,2%%date:~-10,2%.sql"
)
if errorlevel 1 (
    echo GRESKA: Backup nije uspio. Pokreni CHECK_MYSQL.bat
    pause
    exit /b 1
)

echo.
echo [3/7] Composer (produkcija)...
echo Napomena: moze potrajati 1-5 minuta - pricekajte...

SET COMPOSER_CMD=
where composer >nul 2>&1
if not errorlevel 1 set COMPOSER_CMD=composer

if not defined COMPOSER_CMD (
    if exist "C:\ProgramData\ComposerSetup\bin\composer.bat" (
        set "COMPOSER_CMD=C:\ProgramData\ComposerSetup\bin\composer.bat"
    )
)

if not defined COMPOSER_CMD (
    if exist "%PROJECT_DIR%\composer.phar" (
        "%PHP_PATH%" "%PROJECT_DIR%\composer.phar" install --no-dev --no-interaction --no-scripts
        if errorlevel 1 (
            echo GRESKA: composer install nije uspio.
            pause
            exit /b 1
        )
        goto :composer_post
    )
)

if not defined COMPOSER_CMD (
    echo GRESKA: Composer nije pronadjen. Pokreni INSTALL_COMPOSER.bat
    pause
    exit /b 1
)

echo Koristim: %COMPOSER_CMD%
call %COMPOSER_CMD% install --no-dev --no-interaction --no-scripts
if errorlevel 1 (
    echo GRESKA: composer install nije uspio.
    pause
    exit /b 1
)

:composer_post
"%PHP_PATH%" artisan package:discover --ansi
if errorlevel 1 (
    echo GRESKA: package:discover nije uspio.
    pause
    exit /b 1
)

echo.
echo [4/7] Frontend build (vite)...
cd /d "%PROJECT_DIR%\frontend"
taskkill /F /IM node.exe >nul 2>&1

if not exist "node_modules\vite" (
    call npm ci
    if errorlevel 1 call npm install
    if errorlevel 1 (
        echo GRESKA: npm install nije uspio.
        cd /d "%PROJECT_DIR%"
        pause
        exit /b 1
    )
)

call npx vite build
if errorlevel 1 (
    echo GRESKA: vite build nije uspio.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"

echo.
echo [5/7] Migracije baze i verzija...
"%PHP_PATH%" migrate.php
if errorlevel 1 (
    echo GRESKA: migrate.php nije uspio.
    pause
    exit /b 1
)

"%PHP_PATH%" artisan migrate --force
if errorlevel 1 (
    echo.
    echo UPOZORENJE: artisan migrate nije uspio.
    echo Tabele vjerovatno vec postoje u bazi.
    echo Jednokratno pokreni: REGISTER_LARAVEL_MIGRATIONS.bat
    echo Deploy nastavlja dalje...
)

echo.
echo Sinkronizacija verzije iz app\release.json...
"%PHP_PATH%" artisan app:version-sync
if errorlevel 1 (
    echo UPOZORENJE: app:version-sync nije uspio.
    echo Aplikacija i dalje koristi verziju iz app\release.json u API-ju.
    echo Jednokratno pokreni: SYNC_APP_VERSION.bat
)

echo.
echo [6/7] Laravel cache...
"%PHP_PATH%" artisan config:cache
"%PHP_PATH%" artisan route:cache
"%PHP_PATH%" artisan view:cache

echo.
echo [7/7] Deploy zavrsen!
echo ========================================
echo Provjeri aplikaciju u browseru.
echo Log: storage\logs\laravel.log
echo.
pause
