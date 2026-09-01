@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

echo.
echo ============================================================
echo   PlanTim - HTTPS mreza (https://IP:5173)
echo ============================================================
echo.

cd /d "%~dp0"

if not exist "PLANTIM_SERVER_IP.txt" (
    if exist "PLANTIM_SERVER_IP.txt.example" (
        copy /Y "PLANTIM_SERVER_IP.txt.example" "PLANTIM_SERVER_IP.txt" >nul
        echo Kreiran PLANTIM_SERVER_IP.txt iz primjera.
        echo Uredite ga ako IP nije tacan.
        echo.
    )
)

echo [1/3] SSL certifikat za Vite...
call "%~dp0GENERATE_VITE_SSL_CERT.bat"
if errorlevel 1 exit /b 1

echo.
echo [2/3] Mrezna konfiguracija (.env)...
call "%~dp0UPDATE_NETWORK_CONFIG.bat" --no-pause
if errorlevel 1 exit /b 1

echo.
echo [3/3] Firewall (5173, 8000)...
net session >nul 2>&1
if errorlevel 1 (
    echo UPOZORENJE: Pokrenite kao Administrator za firewall pravila.
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows-firewall-internal.ps1"
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "if (Test-Path 'PLANTIM_SERVER_IP.txt') { (Get-Content 'PLANTIM_SERVER_IP.txt' -Raw).Trim() } elseif (Test-Path 'TRENUTNA_IP_ADRESA.txt') { $t=Get-Content 'TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] } }"`) do set "LOCAL_IP=%%I"

echo.
echo ============================================================
echo   SETUP ZAVRSEN
echo ============================================================
echo.
echo Otvorite: https://!LOCAL_IP!:5173/login
echo Pokretanje: START_ALL_AUTO_NETWORK.bat
echo.
pause
exit /b 0
