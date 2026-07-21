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
"%GIT_PATH%" checkout main
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: git checkout main nije uspio.
    pause
    exit /b 1
)

"%GIT_PATH%" pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: git pull nije uspio.
    pause
    exit /b 1
)

echo.
echo [4/7] Composer (produkcija)...

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
        "%PHP_PATH%" "%PROJECT_DIR%\composer.phar" install --no-dev --optimize-autoloader --no-interaction
        if errorlevel 1 (
            echo GRESKA: composer install nije uspio.
            pause
            exit /b 1
        )
        goto :composer_done
    )
)

if not defined COMPOSER_CMD (
    echo GRESKA: Composer nije pronadjen.
    echo Pokreni jednom: INSTALL_COMPOSER.bat
    echo Ili instaliraj: https://getcomposer.org/download/
    pause
    exit /b 1
)

echo Koristim: %COMPOSER_CMD%
call %COMPOSER_CMD% install --no-dev --optimize-autoloader --no-interaction
if errorlevel 1 (
    echo GRESKA: composer install nije uspio.
    pause
    exit /b 1
)
:composer_done

echo.
echo [5/7] Frontend build...
cd /d "%PROJECT_DIR%\frontend"

echo Zaustavljanje Node procesa (ako rade)...
taskkill /F /IM node.exe >nul 2>&1

echo Ciscenje node_modules (ako postoji problem s lockom)...
if exist "node_modules" (
    rmdir /s /q "node_modules" 2>nul
    if exist "node_modules" (
        echo UPOZORENJE: node_modules nije moguce obrisati.
        echo Pokreni CMD kao Administrator ili zatvori programe koji koriste frontend.
        echo Pokusavam npm ci ipak...
    )
)

call npm ci
if errorlevel 1 (
    echo npm ci nije uspio. Pokusaj npm install...
    call npm install
    if errorlevel 1 (
        echo GRESKA: npm install nije uspio.
        cd /d "%PROJECT_DIR%"
        pause
        exit /b 1
    )
)

call npm run build
if errorlevel 1 (
    echo GRESKA: npm run build nije uspio.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"

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
