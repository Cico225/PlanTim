@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - Produkcijski deploy (Windows Server + XAMPP)
REM Pokrece: backup -> git pull main -> build -> migracije
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET GIT_PATH=C:\Program Files\Git\bin\git.exe
SET PROJECT_DIR=C:\xampp\htdocs\PlanTim
SET COMPOSER_PATH=composer

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
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - DEPLOY (main grana)
echo ========================================
echo Folder: %PROJECT_DIR%
echo.

echo [1/7] Backup baze...
call "%PROJECT_DIR%\BACKUP_DATABASE.bat"
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: Backup nije uspio. Deploy prekinut.
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
%COMPOSER_PATH% install --no-dev --optimize-autoloader --no-interaction
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: composer install nije uspio.
    pause
    exit /b 1
)

echo.
echo [5/7] Frontend build...
cd /d "%PROJECT_DIR%\frontend"
call npm ci
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: npm ci nije uspio.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: npm run build nije uspio.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"

echo.
echo [6/7] SQL migracije...
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
echo Deploy uspjesno zavrsen!
echo ========================================
echo Provjeri aplikaciju u browseru i log:
echo   storage\logs\laravel.log
echo.
pause
