@echo off
SETLOCAL EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title PlanTim - HTTPS pokretanje (mreza)
color 0A

echo.
echo ============================================================
echo   PlanTim - HTTPS pokretanje (https://IP:5173)
echo ============================================================
echo.

cd /d "%~dp0"

SET PHP_PATH=C:\xampp\php\php.exe
if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen na %PHP_PATH%
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo GRESKA: frontend\package.json ne postoji.
    pause
    exit /b 1
)

if not exist "frontend\certs\server-cert.pem" (
    echo [KORAK 0] SSL certifikat ne postoji — generisanje...
    call "%~dp0GENERATE_VITE_SSL_CERT.bat"
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

echo [KORAK 1] Azuriranje mrezne konfiguracije...
call "%~dp0UPDATE_NETWORK_CONFIG.bat" --no-pause
if errorlevel 1 (
    pause
    exit /b 1
)

"%PHP_PATH%" artisan config:clear >nul 2>&1

set "LOCAL_IP="
if exist "PLANTIM_SERVER_IP.txt" set /p LOCAL_IP=<"PLANTIM_SERVER_IP.txt"
if "!LOCAL_IP!"=="" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content 'TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "LOCAL_IP=%%I"
)

echo.
echo [KORAK 2] MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if errorlevel 1 (
    echo Pokretanje MySQL...
    if exist "C:\xampp\mysql_start.bat" (
        start "" /MIN "C:\xampp\mysql_start.bat"
        timeout /t 5 /nobreak >nul
    ) else (
        echo UPOZORENJE: Pokrenite MySQL iz XAMPP Control Panel-a.
    )
)

echo.
echo [KORAK 3] Backend (Laravel artisan serve)...
echo        http://127.0.0.1:8000
start "PlanTim Backend" cmd /k "cd /d %~dp0 && %PHP_PATH% artisan serve --host=127.0.0.1 --port=8000"

timeout /t 5 /nobreak >nul

echo.
echo [KORAK 4] Frontend (Vite HTTPS)...
echo        https://!LOCAL_IP!:5173
start "PlanTim Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   SERVERI POKRENUTI
echo ============================================================
echo.
echo IP:         !LOCAL_IP!
echo Aplikacija: https://!LOCAL_IP!:5173/login
echo.
echo Kredencijali:
echo   Email:    admin@plantim.com
echo   Lozinka:  password
echo.
echo NAPOMENA: Browser moze prikazati upozorenje o certifikatu.
echo          Advanced -^> Accept the Risk and Continue
echo.
echo ============================================================
echo.

timeout /t 5 /nobreak >nul
start https://!LOCAL_IP!:5173/login

echo Pritisnite bilo koji taster za zatvaranje...
echo (Serveri nastavljaju u pozadini)
pause >nul
ENDLOCAL
