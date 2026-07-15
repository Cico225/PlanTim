@echo off
chcp 65001 >nul
title PlanTim - Automatsko Ažuriranje Mrežne Konfiguracije
color 0B

echo.
echo ═══════════════════════════════════════════════════════════════
echo   PlanTim - Automatska Mrežna Konfiguracija
echo ═══════════════════════════════════════════════════════════════
echo.

REM Detekcija lokalne IP adrese
echo [1/3] Detektujem vašu lokalnu IP adresu...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP_RAW=%%a
    goto :found_ip
)
:found_ip
REM Uklanjanje razmaka
for /f "tokens=* delims= " %%a in ("%IP_RAW%") do set LOCAL_IP=%%a

if "%LOCAL_IP%"=="" (
    echo ❌ GREŠKA: Ne mogu detektovati IP adresu!
    echo    Molim pokrenite ručno ili provjerite mrežnu konekciju.
    pause
    exit /b 1
)

echo ✅ Detektovana IP adresa: %LOCAL_IP%
echo.

REM Kreiranje Backend .env konfiguracije
echo [2/3] Ažuriram Backend konfiguraciju...

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
    ) else (
        echo ❌ GREŠKA: .env.example ne postoji!
        pause
        exit /b 1
    )
)

REM Ažuriranje APP_URL u backend .env
powershell -Command "(Get-Content .env) -replace 'APP_URL=.*', 'APP_URL=http://%LOCAL_IP%:8000' | Set-Content .env"

echo ✅ Backend konfigurisan za: http://%LOCAL_IP%:8000
echo.

REM Kreiranje Frontend .env konfiguracije
echo [3/3] Ažuriram Frontend konfiguraciju...

if not exist "frontend\.env" (
    if exist "frontend\env-template.txt" (
        copy frontend\env-template.txt frontend\.env >nul
    )
)

REM Kreiranje frontend .env sa ispravnom IP adresom
(
echo VITE_API_URL=http://%LOCAL_IP%:8000/api
echo VITE_APP_NAME=PlanTim
echo VITE_APP_URL=http://%LOCAL_IP%:5173
echo VITE_DEFAULT_LANGUAGE=bs
echo VITE_DEFAULT_THEME=light
echo VITE_WS_URL=ws://%LOCAL_IP%:6001
) > frontend\.env

echo ✅ Frontend konfigurisan za: http://%LOCAL_IP%:5173
echo.

echo ═══════════════════════════════════════════════════════════════
echo   ✅ KONFIGURACIJA USPEŠNO AŽURIRANA!
echo ═══════════════════════════════════════════════════════════════
echo.
echo 📱 Vaša lokalna IP adresa: %LOCAL_IP%
echo.
echo 🌐 Pristupite aplikaciji sa:
echo    • Ovaj računar:    http://localhost:5173
echo    • Drugi uređaji:   http://%LOCAL_IP%:5173
echo.
echo 💡 Kada promenite WiFi mrežu, ponovo pokrenite ovaj fajl!
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

REM Kreiranje quick access fajla sa trenutnom IP adresom
(
echo Trenutna IP adresa: %LOCAL_IP%
echo.
echo Frontend: http://%LOCAL_IP%:5173
echo Backend:  http://%LOCAL_IP%:8000
echo API:      http://%LOCAL_IP%:8000/api
echo.
echo Lokalni pristup:
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
) > TRENUTNA_IP_ADRESA.txt

echo ℹ️  Informacije sačuvane u: TRENUTNA_IP_ADRESA.txt
echo.

pause






