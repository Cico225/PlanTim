@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title PlanTim - Produkcijski server (HTTPS)
color 0B

echo.
echo ============================================================
echo   PlanTim - Produkcijsko pokretanje (Windows Server)
echo ============================================================
echo.
echo Ova skripta koristi Apache HTTPS (port 443).
echo NE pokrece Vite dev server (port 5173).
echo.

cd /d "%~dp0"

if not exist "C:\xampp\php\php.exe" (
    echo GRESKA: XAMPP nije pronadjen na C:\xampp\
    pause
    exit /b 1
)

echo [KORAK 1] Produkcijska konfiguracija...
call "%~dp0UPDATE_PRODUCTION_CONFIG.bat"
if errorlevel 1 (
    pause
    exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%~dp0TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "LOCAL_IP=%%I"

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
) else (
    echo MySQL je aktivan.
)

echo.
echo [KORAK 3] Frontend build (ako dist ne postoji)...
if not exist "frontend\dist\index.html" (
    echo dist\index.html ne postoji — pokrecem build...
    call "%~dp0BUILD_PRODUCTION_FRONTEND.bat"
    if errorlevel 1 (
        pause
        exit /b 1
    )
) else (
    echo frontend\dist postoji — preskacem build.
)

if exist "frontend\public\.htaccess" (
    copy /Y "frontend\public\.htaccess" "frontend\dist\.htaccess" >nul
)

echo.
echo [KORAK 4] Apache API rutiranje...
if exist "%~dp0FIX_API_ROUTING.bat" (
    call "%~dp0FIX_API_ROUTING.bat" --no-pause
) else (
    echo UPOZORENJE: FIX_API_ROUTING.bat nije pronadjen.
)

echo.
echo [KORAK 5] Apache...
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if errorlevel 1 (
    echo Pokretanje Apache...
    if exist "C:\xampp\apache_start.bat" (
        start "" /MIN "C:\xampp\apache_start.bat"
        timeout /t 3 /nobreak >nul
    ) else (
        echo UPOZORENJE: Pokrenite Apache iz XAMPP Control Panel-a.
    )
) else (
    echo Apache je aktivan. Preporuka: XAMPP Stop -^> Start Apache nakon promjena.
)

echo.
echo [KORAK 6] Laravel cache...
if exist ".env" (
    "C:\xampp\php\php.exe" artisan config:cache >nul 2>&1
    "C:\xampp\php\php.exe" artisan route:cache >nul 2>&1
)

echo.
echo ============================================================
echo   PRODUKCIJA SPREMNA
echo ============================================================
echo.
echo IP:        !LOCAL_IP!
echo Aplikacija: https://!LOCAL_IP!/login
echo.
echo NE koristite:  http://!LOCAL_IP!:5173
echo NE koristite:  START_ALL_AUTO_NETWORK.bat na serveru
echo.
echo ============================================================
echo.

timeout /t 3 /nobreak >nul
start https://!LOCAL_IP!/login

echo Pritisnite bilo koji taster za zatvaranje...
pause >nul
exit /b 0
