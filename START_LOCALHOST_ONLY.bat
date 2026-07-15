@echo off
chcp 65001 >nul
title PlanTim - Pokretanje (Samo Localhost)
color 0E

echo.
echo ═══════════════════════════════════════════════════════════════
echo   PlanTim - Pokretanje (Samo ovaj računar - Localhost)
echo ═══════════════════════════════════════════════════════════════
echo.

REM Konfiguracija za localhost
echo [1/2] Podešavanje konfiguracije za localhost...

REM Frontend .env za localhost
(
echo VITE_API_URL=http://localhost:8000/api
echo VITE_APP_NAME=PlanTim
echo VITE_APP_URL=http://localhost:5173
echo VITE_DEFAULT_LANGUAGE=bs
echo VITE_DEFAULT_THEME=light
echo VITE_WS_URL=ws://localhost:6001
) > frontend\.env

echo ✅ Konfiguracija postavljena za localhost
echo.

REM Provera da li je MySQL pokrenut
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo ⚠️  MySQL nije pokrenut! Pokretanje XAMPP MySQL servisa...
    start "" "C:\xampp\mysql_start.bat"
    timeout /t 5 /nobreak >nul
)

echo [2/2] Pokretanje servera...
echo.

REM Pokretanje Backend servera
echo 🚀 Pokretanje Backend servera...
start "PlanTim Backend" cmd /k "cd /d %~dp0 && C:\xampp\php\php.exe artisan serve"

timeout /t 5 /nobreak >nul

REM Pokretanje Frontend servera
echo 🚀 Pokretanje Frontend servera...
start "PlanTim Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ═══════════════════════════════════════════════════════════════
echo   ✅ SERVERI POKRENUTI!
echo ═══════════════════════════════════════════════════════════════
echo.
echo 🌐 Pristup: http://localhost:5173
echo.
echo 🔑 Kredencijali:
echo    Email:    admin@plantim.com
echo    Lozinka:  password
echo.
echo ⚠️  Napomena: Ova konfiguracija radi SAMO na ovom računaru.
echo    Za pristup preko mreže koristite: START_ALL_AUTO_NETWORK.bat
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
pause






