@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title PlanTim - Mrezna konfiguracija (HTTPS :5173)
color 0B

set "NO_PAUSE=0"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

echo.
echo ============================================================
echo   PlanTim - HTTPS mrezna konfiguracija
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] IP adresa servera...
set "LOCAL_IP="
set "IP_TMP=%TEMP%\plantim-server-ip.txt"
del /F /Q "%IP_TMP%" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\resolve-server-ip.ps1" -OutputFile "%IP_TMP%" >nul 2>&1
if exist "%IP_TMP%" (
    set /p LOCAL_IP=<"%IP_TMP%"
    del /F /Q "%IP_TMP%" 2>nul
)

if "!LOCAL_IP!"=="" (
    echo GRESKA: Ne mogu detektovati IP adresu.
    echo Kreirajte PLANTIM_SERVER_IP.txt sa IP adresom, npr. 192.168.1.126
    if "!NO_PAUSE!"=="0" pause
    exit /b 1
)

echo IP: !LOCAL_IP!
echo.

echo [2/4] Backend .env...
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
    ) else (
        echo GRESKA: .env ne postoji.
        if "!NO_PAUSE!"=="0" pause
        exit /b 1
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-network-env.ps1" -ServerIp "!LOCAL_IP!"
if errorlevel 1 (
    echo GRESKA: Azuriranje .env nije uspjelo.
    if "!NO_PAUSE!"=="0" pause
    exit /b 1
)

echo Backend: https://!LOCAL_IP!:5173
echo.

echo [3/4] Frontend .env...
if not exist "frontend\.env" (
    if exist "frontend\env-template.txt" (
        copy /Y "frontend\env-template.txt" "frontend\.env" >nul
    )
)

(
echo VITE_API_URL=/api
echo VITE_APP_NAME=PlanTim
echo VITE_APP_URL=https://!LOCAL_IP!:5173
echo VITE_DEFAULT_LANGUAGE=bs
echo VITE_DEFAULT_THEME=light
echo VITE_WS_URL=wss://!LOCAL_IP!:6001
echo VITE_OFFICE365_REDIRECT_URI=https://!LOCAL_IP!:5173/auth/office365/callback
) > frontend\.env

echo Frontend: https://!LOCAL_IP!:5173
echo.

echo [4/4] TRENUTNA_IP_ADRESA.txt...
(
echo !LOCAL_IP!
echo.
echo Aplikacija: https://!LOCAL_IP!:5173/login
echo API proxy:  https://!LOCAL_IP!:5173/api
echo Backend:    http://127.0.0.1:8000
) > TRENUTNA_IP_ADRESA.txt

if not exist "PLANTIM_SERVER_IP.txt" (
    echo !LOCAL_IP!> PLANTIM_SERVER_IP.txt
)

echo.
echo ============================================================
echo   Konfiguracija azurirana
echo ============================================================
echo.
echo   https://!LOCAL_IP!:5173/login
echo.
if "!NO_PAUSE!"=="0" pause
exit /b 0
