@echo off
SETLOCAL
chcp 65001 >nul 2>&1
title PlanTim - Automatsko Pokretanje (Auto Network)
color 0A

echo.
echo ============================================================
echo   PlanTim - Automatsko Pokretanje sa Auto Network
echo ============================================================
echo.

REM Provera da li postoji PHP
SET PHP_PATH=C:\xampp\php\php.exe
if not exist "%PHP_PATH%" (
    echo [GRESKA] PHP nije pronadjen na: %PHP_PATH%
    echo.
    echo Molimo proverite da li je XAMPP instaliran na C:\xampp\
    echo.
    pause
    exit /b 1
)

REM Provera da li postoji frontend folder
cd /d "%~dp0"
if not exist "frontend" (
    echo [GRESKA] Frontend folder nije pronadjen!
    echo.
    pause
    exit /b 1
)

REM Provera da li postoji package.json u frontend folderu
if not exist "frontend\package.json" (
    echo [GRESKA] package.json nije pronadjen u frontend folderu!
    echo.
    pause
    exit /b 1
)

REM Provera da li postoji UPDATE_NETWORK_CONFIG.bat
if not exist "UPDATE_NETWORK_CONFIG.bat" (
    echo [GRESKA] UPDATE_NETWORK_CONFIG.bat nije pronadjen!
    echo.
    pause
    exit /b 1
)

REM Prvo azuriraj mreznu konfiguraciju
echo [KORAK 1] Azuriranje mrezne konfiguracije...
call UPDATE_NETWORK_CONFIG.bat

if errorlevel 1 (
    echo [GRESKA] Greska pri azuriranju mrezne konfiguracije!
    pause
    exit /b 1
)

echo.
echo [KORAK 2] Pokretanje servera...
echo.

REM Detekcija IP adrese ponovo za servere
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP_RAW=%%a
    goto :found_ip
)
:found_ip
for /f "tokens=* delims= " %%a in ("%IP_RAW%") do set LOCAL_IP=%%a

REM Provera da li je MySQL pokrenut
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [UPOZORENJE] MySQL nije pokrenut! Pokretanje XAMPP MySQL servisa...
    if exist "C:\xampp\mysql_start.bat" (
        start "" "C:\xampp\mysql_start.bat"
        timeout /t 5 /nobreak >nul
    )
)

REM Pokretanje Backend servera na svim interfejsima (0.0.0.0 = localhost + mrezni)
echo [INFO] Pokretanje Backend servera...
echo        Dostupan na: http://localhost:8000 i http://%LOCAL_IP%:8000
start "PlanTim Backend" cmd /k "cd /d %~dp0 && C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=8000"

timeout /t 5 /nobreak >nul

REM Pokretanje Frontend servera na svim interfejsima
echo [INFO] Pokretanje Frontend servera...
echo        Dostupan na: http://localhost:5173 i http://%LOCAL_IP%:5173
start "PlanTim Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   [USPEH] SVI SERVERI SU POKRENUTI!
echo ============================================================
echo.
echo Vasa IP adresa: %LOCAL_IP%
echo.
echo Pristupite aplikaciji:
echo    - Sa ovog racunara:     http://localhost:5173
echo    - Sa drugih uredaja:    http://%LOCAL_IP%:5173
echo.
echo Kredencijali:
echo    Email:    admin@plantim.com
echo    Lozinka:  password
echo.
echo TIP: Kada promenite WiFi, samo zatvorite servere
echo      i ponovo pokrenite ovaj fajl!
echo.
echo ============================================================
echo.

REM Cekanje 5 sekundi pa otvaranje browsera
timeout /t 5 /nobreak >nul

echo [INFO] Otvaranje aplikacije u browseru...
start http://localhost:5173

echo.
echo Pritisnite bilo koji taster za zatvaranje ovog prozora...
echo (Serveri ce nastaviti da rade u pozadini)
echo.
pause

ENDLOCAL
