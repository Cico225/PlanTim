@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

REM PlanTim — produkcijska mrežna konfiguracija (HTTPS, bez porta 5173)

echo.
echo ============================================================
echo   PlanTim - Produkcijska konfiguracija (HTTPS)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Detekcija IP adrese...
set "LOCAL_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -First 1 -ExpandProperty IPAddress) }; if ($ip) { $ip }"`) do set "LOCAL_IP=%%I"

if "!LOCAL_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "IP_RAW=%%a"
        goto :found_ip
    )
    :found_ip
    for /f "tokens=* delims= " %%a in ("!IP_RAW!") do set "LOCAL_IP=%%a"
)

if exist "TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%~dp0TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do (
        if "!LOCAL_IP!"=="" set "LOCAL_IP=%%I"
    )
)

if "!LOCAL_IP!"=="" (
    echo GRESKA: Ne mogu detektovati IP adresu.
    set /p LOCAL_IP=Unesite IP servera (npr. 192.168.1.126): 
)

if "!LOCAL_IP!"=="" (
    echo GRESKA: IP adresa nije unesena.
    exit /b 1
)

echo IP servera: !LOCAL_IP!
echo.

echo [2/4] Zaustavljanje dev servera (port 5173 i 8000)...
taskkill /F /IM node.exe >nul 2>&1
for /f "tokens=2" %%P in ('tasklist /FI "WINDOWTITLE eq PlanTim Backend*" /FO LIST 2^>nul ^| findstr /I "PID:"') do taskkill /F /PID %%P >nul 2>&1

echo [3/4] Azuriranje backend .env...
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
    ) else (
        echo GRESKA: .env ne postoji.
        exit /b 1
    )
)

powershell -NoProfile -Command ^
  "$ip='!LOCAL_IP!';" ^
  "$url='https://'+$ip;" ^
  "$c=Get-Content '.env';" ^
  "$c=$c -replace '^APP_URL=.*','APP_URL='+$url;" ^
  "$c=$c -replace '^FRONTEND_URL=.*','FRONTEND_URL='+$url;" ^
  "$c=$c -replace '^SANCTUM_STATEFUL_DOMAINS=.*','SANCTUM_STATEFUL_DOMAINS='+$ip;" ^
  "$c=$c -replace '^CORS_ALLOWED_ORIGINS=.*','CORS_ALLOWED_ORIGINS='+$url;" ^
  "$c=$c -replace '^SESSION_SECURE_COOKIE=.*','SESSION_SECURE_COOKIE=true';" ^
  "if ($c -notmatch '^APP_ENV=') { $c += 'APP_ENV=production' } else { $c=$c -replace '^APP_ENV=.*','APP_ENV=production' };" ^
  "if ($c -notmatch '^APP_DEBUG=') { $c += 'APP_DEBUG=false' } else { $c=$c -replace '^APP_DEBUG=.*','APP_DEBUG=false' };" ^
  "Set-Content '.env' $c -Encoding UTF8"

echo Backend: !LOCAL_IP! (HTTPS)
echo.

echo [4/4] Sacuvavanje TRENUTNA_IP_ADRESA.txt...
(
echo !LOCAL_IP!
echo.
echo Aplikacija: https://!LOCAL_IP!/login
echo API:        https://!LOCAL_IP!/api
echo.
echo NAPOMENA: Na serveru NE koristite START_ALL_AUTO_NETWORK.bat
echo Koristite START_PRODUCTION_SERVER.bat
) > TRENUTNA_IP_ADRESA.txt

echo.
echo ============================================================
echo   Konfiguracija azurirana za produkciju
echo ============================================================
echo.
echo Otvorite: https://!LOCAL_IP!/login
echo.

exit /b 0
