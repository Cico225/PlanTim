@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - SERVER: povuci verziju s GitHuba (main) + deploy
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET GIT_PATH=C:\Program Files\Git\bin\git.exe
SET PROJECT_DIR=C:\xampp\htdocs\PlanTim

cd /d "%PROJECT_DIR%"
if %ERRORLEVEL% NEQ 0 (
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
    echo Instaliraj Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - PULL s GitHuba (main)
echo ========================================
echo Folder: %PROJECT_DIR%
echo.

echo [1/7] Backup baze...
"%PHP_PATH%" scripts\backup-database.php
if errorlevel 1 (
    echo GRESKA: Backup nije uspio. Pokreni CHECK_MYSQL.bat
    pause
    exit /b 1
)

echo.
echo [2/7] Git fetch...
"%GIT_PATH%" fetch origin
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: git fetch nije uspio.
    pause
    exit /b 1
)

echo.
echo [3/7] Prebacivanje na main i pull...

if exist "TRENUTNA_IP_ADRESA.txt" (
    copy /Y "TRENUTNA_IP_ADRESA.txt" "TRENUTNA_IP_ADRESA.txt.bak" >nul
)

"%GIT_PATH%" checkout main
if errorlevel 1 (
    echo GRESKA: git checkout main nije uspio.
    pause
    exit /b 1
)

REM Ukloni rucno kopirane fajlove prije pull-a (dolaze iz GitHuba)
for %%F in (
    "CHECK_MYSQL.bat"
    "CHECK_PHP_EXTENSIONS.bat"
    "ENABLE_GD_EXTENSION.bat"
    "ENABLE_PHP_EXTENSIONS.bat"
    "INSTALL_COMPOSER.bat"
    "PULL_FROM_GITHUB.bat"
    "PUSH_TO_GITHUB.bat"
    "scripts\backup-database.php"
    "scripts\check-mysql.php"
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

echo.
echo [4/7] Composer (produkcija)...
echo Napomena: ako nema novih paketa, ovo traje 30-60 sekundi.
echo           Spor server/antivirus moze usporiti do 5 minuta - pricekajte...

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
        echo Koristim: composer.phar
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
    echo GRESKA: Composer nije pronadjen.
    echo Pokreni jednom: INSTALL_COMPOSER.bat
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
echo Pokrecem artisan package:discover...
"%PHP_PATH%" artisan package:discover --ansi
if errorlevel 1 (
    echo GRESKA: package:discover nije uspio.
    pause
    exit /b 1
)
echo Composer korak zavrsen.

echo.
echo [5/7] Frontend build (vite, bez tsc)...
cd /d "%PROJECT_DIR%\frontend"

echo Zaustavljanje Node procesa (ako rade)...
taskkill /F /IM node.exe >nul 2>&1

if not exist "node_modules\vite" (
    echo Instalacija npm paketa...
    call npm ci
    if errorlevel 1 (
        call npm install
        if errorlevel 1 (
            echo GRESKA: npm install nije uspio.
            cd /d "%PROJECT_DIR%"
            pause
            exit /b 1
        )
    )
)

echo Pokretanje vite build...
call npx vite build
if errorlevel 1 (
    echo GRESKA: vite build nije uspio.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"
echo Frontend build zavrsen.

echo.
echo [6/7] Migracije baze...
"%PHP_PATH%" migrate.php
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: migrate.php nije uspio.
    pause
    exit /b 1
)

"%PHP_PATH%" artisan migrate --force
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: artisan migrate nije uspio.
    pause
    exit /b 1
)

echo.
echo [7/7] Laravel cache...
"%PHP_PATH%" artisan config:cache
"%PHP_PATH%" artisan route:cache
"%PHP_PATH%" artisan view:cache

echo.
echo ========================================
echo Verzija uspjesno preuzeta s GitHuba!
echo ========================================
echo Provjeri aplikaciju u browseru.
echo Log: storage\logs\laravel.log
echo.
pause
