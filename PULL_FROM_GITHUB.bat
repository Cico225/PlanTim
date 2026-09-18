@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title PlanTim - PULL s GitHuba
color 0B

REM ============================================================
REM PlanTim - povuci kod s GitHuba + deploy
REM Radi i na laptopu i na serveru (folder = lokacija ove skripte)
REM ============================================================

echo.
echo ========================================
echo PlanTim - PULL s GitHuba
echo ========================================
echo.

REM Folder projekta = gdje je ova .bat (ne hardkodirani server path)
cd /d "%~dp0"
if errorlevel 1 (
    echo GRESKA: Ne mogu uci u folder skripte: %~dp0
    goto :fail
)
SET "PROJECT_DIR=%CD%"
echo Folder: %PROJECT_DIR%
echo.

SET "PHP_PATH=C:\xampp\php\php.exe"
if not exist "%PHP_PATH%" (
    where php >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%P in ('where php') do (
            SET "PHP_PATH=%%P"
            goto :php_ok
        )
    )
    echo GRESKA: PHP nije pronadjen ^(ocekivano: C:\xampp\php\php.exe^).
    goto :fail
)
:php_ok
echo PHP: %PHP_PATH%

REM Pronadji Git (vise mogucih lokacija)
SET "GIT_PATH="
if exist "C:\Program Files\Git\bin\git.exe" SET "GIT_PATH=C:\Program Files\Git\bin\git.exe"
if not defined GIT_PATH if exist "C:\Program Files (x86)\Git\bin\git.exe" SET "GIT_PATH=C:\Program Files (x86)\Git\bin\git.exe"
if not defined GIT_PATH (
    where git >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%G in ('where git') do (
            SET "GIT_PATH=%%G"
            goto :git_ok
        )
    )
)
:git_ok
if not defined GIT_PATH (
    echo GRESKA: Git nije instaliran ili nije u PATH-u.
    echo Instalirajte Git for Windows: https://git-scm.com/download/win
    goto :fail
)
echo Git: %GIT_PATH%
echo.

if not exist "%PROJECT_DIR%\.git" (
    echo GRESKA: Ovo nije git repo ^(.git nedostaje^).
    echo Pokrenite: REPAIR_GIT_ON_SERVER.bat
    goto :fail
)

REM Grana: develop (trenutni development), fallback main
SET "BRANCH=develop"
"%GIT_PATH%" ls-remote --heads origin develop >nul 2>&1
if errorlevel 1 (
    SET "BRANCH=main"
)
echo Ciljna grana: %BRANCH%
echo.

echo [1/7] Git fetch i pull...

SET "LOCAL_BAK=%TEMP%\plantim-pull-local-%RANDOM%"
mkdir "%LOCAL_BAK%" 2>nul
if exist "TRENUTNA_IP_ADRESA.txt" copy /Y "TRENUTNA_IP_ADRESA.txt" "%LOCAL_BAK%\TRENUTNA_IP_ADRESA.txt" >nul
if exist "PLANTIM_SERVER_IP.txt" copy /Y "PLANTIM_SERVER_IP.txt" "%LOCAL_BAK%\PLANTIM_SERVER_IP.txt" >nul
if exist ".env" copy /Y ".env" "%LOCAL_BAK%\.env" >nul
if exist "frontend\.env" copy /Y "frontend\.env" "%LOCAL_BAK%\frontend.env" >nul
if exist "frontend\certs" xcopy /E /I /Y /Q "frontend\certs" "%LOCAL_BAK%\certs\" >nul

"%GIT_PATH%" fetch origin
if errorlevel 1 (
    echo GRESKA: git fetch nije uspio.
    echo Provjerite internet / GitHub pristup.
    goto :fail
)

"%GIT_PATH%" checkout -f -B %BRANCH% origin/%BRANCH%
if errorlevel 1 (
    echo GRESKA: git checkout %BRANCH% nije uspio.
    goto :fail
)

"%GIT_PATH%" branch --set-upstream-to=origin/%BRANCH% %BRANCH% 2>nul
"%GIT_PATH%" reset --hard origin/%BRANCH%
if errorlevel 1 (
    echo GRESKA: git reset --hard origin/%BRANCH% nije uspio.
    goto :fail
)

REM Vrati lokalne fajlove (IP, .env, certs)
if exist "%LOCAL_BAK%\TRENUTNA_IP_ADRESA.txt" copy /Y "%LOCAL_BAK%\TRENUTNA_IP_ADRESA.txt" "TRENUTNA_IP_ADRESA.txt" >nul
if exist "%LOCAL_BAK%\PLANTIM_SERVER_IP.txt" copy /Y "%LOCAL_BAK%\PLANTIM_SERVER_IP.txt" "PLANTIM_SERVER_IP.txt" >nul
if exist "%LOCAL_BAK%\.env" copy /Y "%LOCAL_BAK%\.env" ".env" >nul
if exist "%LOCAL_BAK%\frontend.env" (
    if not exist "frontend" mkdir "frontend"
    copy /Y "%LOCAL_BAK%\frontend.env" "frontend\.env" >nul
)
if exist "%LOCAL_BAK%\certs" (
    if not exist "frontend\certs" mkdir "frontend\certs"
    xcopy /E /I /Y /Q "%LOCAL_BAK%\certs\*" "frontend\certs\" >nul
)
rmdir /S /Q "%LOCAL_BAK%" 2>nul

echo Git pull zavrsen ^(%BRANCH%^).
echo.

echo [2/7] Backup baze (opcionalno)...
if exist "scripts\backup-database.php" (
    "%PHP_PATH%" scripts\backup-database.php
    if errorlevel 1 (
        echo UPOZORENJE: Backup nije uspio - nastavljam...
    )
) else (
    echo Preskacem backup ^(scripts\backup-database.php ne postoji^).
)

echo.
echo [3/7] Composer...
SET "COMPOSER_CMD="
where composer >nul 2>&1
if not errorlevel 1 set "COMPOSER_CMD=composer"
if not defined COMPOSER_CMD if exist "C:\ProgramData\ComposerSetup\bin\composer.bat" set "COMPOSER_CMD=C:\ProgramData\ComposerSetup\bin\composer.bat"
if not defined COMPOSER_CMD if exist "%PROJECT_DIR%\composer.phar" (
    "%PHP_PATH%" "%PROJECT_DIR%\composer.phar" install --no-interaction --no-scripts
    if errorlevel 1 (
        echo GRESKA: composer.phar install nije uspio.
        goto :fail
    )
    goto :composer_post
)
if not defined COMPOSER_CMD (
    echo UPOZORENJE: Composer nije pronadjen - preskacem.
    goto :composer_post
)
echo Koristim: %COMPOSER_CMD%
call %COMPOSER_CMD% install --no-interaction --no-scripts
if errorlevel 1 (
    echo GRESKA: composer install nije uspio.
    goto :fail
)

:composer_post
"%PHP_PATH%" artisan package:discover --ansi >nul 2>&1

echo.
echo [4/7] Frontend - npm + vite ^(dev: dovoljno npm; build opcionalan^)...
cd /d "%PROJECT_DIR%\frontend"
if not exist "package.json" (
    echo UPOZORENJE: frontend\package.json ne postoji.
    cd /d "%PROJECT_DIR%"
    goto :after_frontend
)

where node >nul 2>&1
if errorlevel 1 (
    echo UPOZORENJE: Node.js nije u PATH-u - preskacem frontend.
    cd /d "%PROJECT_DIR%"
    goto :after_frontend
)

if not exist "node_modules" (
    echo npm install...
    call npm install
    if errorlevel 1 (
        echo GRESKA: npm install nije uspio.
        cd /d "%PROJECT_DIR%"
        goto :fail
    )
) else (
    echo npm install ^(update^)...
    call npm install
)

REM Produkcijski build nije obavezan za Vite dev ^(START_ALL^)
echo Vite build ^(za produkciju / Apache^)...
call npx vite build
if errorlevel 1 (
    echo UPOZORENJE: vite build nije uspio - za START_ALL_AUTO_NETWORK to nije kriticno.
)

cd /d "%PROJECT_DIR%"
:after_frontend

echo.
echo [5/7] Migracije i cache...
if exist "migrate.php" (
    "%PHP_PATH%" migrate.php
)
"%PHP_PATH%" artisan migrate --force
if errorlevel 1 (
    echo UPOZORENJE: migrate nije uspio u potpunosti - nastavljam.
)
echo Brisem Laravel route/config/cache ^(bitno za nove API rute^)...
"%PHP_PATH%" artisan route:clear >nul 2>&1
"%PHP_PATH%" artisan config:clear >nul 2>&1
"%PHP_PATH%" artisan cache:clear >nul 2>&1
"%PHP_PATH%" artisan view:clear >nul 2>&1
"%PHP_PATH%" artisan app:version-sync >nul 2>&1

echo.
echo [6/7] Azuriranje mrezne konfiguracije ^(lokalni IP^)...
if exist "UPDATE_NETWORK_CONFIG.bat" (
    call "%PROJECT_DIR%\UPDATE_NETWORK_CONFIG.bat" --no-pause
)

echo.
echo [7/7] Gotovo!
echo ========================================
echo Pokrenite: START_ALL_AUTO_NETWORK.bat
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo NEUSPJEH - pogledajte poruku iznad.
echo ========================================
echo.
pause
exit /b 1
