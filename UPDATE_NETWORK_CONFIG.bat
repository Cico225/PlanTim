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
if exist "PLANTIM_SERVER_IP.txt" (
    set /p LOCAL_IP=<"PLANTIM_SERVER_IP.txt"
)
if "!LOCAL_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "IP_RAW=%%a"
        goto :found_ip
    )
    :found_ip
    for /f "tokens=* delims= " %%a in ("!IP_RAW!") do set "LOCAL_IP=%%a"
)

if "!LOCAL_IP!"=="" (
    echo GRESKA: Ne mogu detektovati IP adresu.
    echo Kreirajte PLANTIM_SERVER_IP.txt sa IP adresom (npr. 192.168.1.126)
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

set "FRONTEND_URL=https://!LOCAL_IP!:5173"
set "BACKEND_URL=http://127.0.0.1:8000"

powershell -NoProfile -Command ^
  "$ip='!LOCAL_IP!';" ^
  "$front='https://'+$ip+':5173';" ^
  "$sanctum=$ip+','+$ip+':5173,localhost,localhost:5173,127.0.0.1,127.0.0.1:5173';" ^
  "$c=Get-Content '.env';" ^
  "$c=$c -replace '^APP_URL=.*','APP_URL='+$front;" ^
  "$c=$c -replace '^FRONTEND_URL=.*','FRONTEND_URL='+$front;" ^
  "$c=$c -replace '^SANCTUM_STATEFUL_DOMAINS=.*','SANCTUM_STATEFUL_DOMAINS='+$sanctum;" ^
  "$c=$c -replace '^CORS_ALLOWED_ORIGINS=.*','CORS_ALLOWED_ORIGINS='+$front;" ^
  "$c=$c -replace '^SESSION_SECURE_COOKIE=.*','SESSION_SECURE_COOKIE=true';" ^
  "if ($c -notmatch '^SESSION_DOMAIN=') { $c += 'SESSION_DOMAIN=' } else { $c=$c -replace '^SESSION_DOMAIN=.*','SESSION_DOMAIN=' };" ^
  "Set-Content '.env' $c -Encoding UTF8"

echo Backend: !FRONTEND_URL!
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

echo.
echo ============================================================
echo   Konfiguracija azurirana
echo ============================================================
echo.
echo   https://!LOCAL_IP!:5173/login
echo.
if "!NO_PAUSE!"=="0" pause
exit /b 0
