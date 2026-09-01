@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM PlanTim - HTTPS setup za Windows Server (samo IP adresa)
REM Pokrenite kao Administrator (desni klik -> Run as administrator)
REM ============================================================

set "PROJECT_DIR=%~dp0"
set "XAMPP_DIR=C:\xampp"
set "APACHE_DIR=%XAMPP_DIR%\apache"
set "OPENSSL=%APACHE_DIR%\bin\openssl.exe"
set "HTTPD_CONF=%APACHE_DIR%\conf\httpd.conf"
set "SERVER_IP=77.77.210.70"

REM --- provjera admin ---
net session >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Pokrenite ovu skriptu kao Administrator.
    pause
    exit /b 1
)

if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    set /p SERVER_IP=<"%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt"
)

echo ========================================
echo PlanTim - HTTPS setup (Windows Server)
echo IP: %SERVER_IP%
echo ========================================
echo.

if not exist "%XAMPP_DIR%" (
    echo GRESKA: XAMPP nije na %XAMPP_DIR%
    pause
    exit /b 1
)

echo [Korak 1/6] Produkcijski frontend build...
call "%PROJECT_DIR%BUILD_PRODUCTION_FRONTEND.bat"
if errorlevel 1 exit /b 1

echo.
echo [Korak 2/6] SSL certifikat (self-signed, 10 godina)...
if not exist "%APACHE_DIR%\conf\ssl.crt" mkdir "%APACHE_DIR%\conf\ssl.crt"
if not exist "%APACHE_DIR%\conf\ssl.key" mkdir "%APACHE_DIR%\conf\ssl.key"

if not exist "%OPENSSL%" (
    echo GRESKA: OpenSSL nije pronadjen: %OPENSSL%
    pause
    exit /b 1
)

if not exist "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" (
    "%OPENSSL%" req -x509 -nodes -days 3650 -newkey rsa:2048 ^
        -keyout "%APACHE_DIR%\conf\ssl.key\plantim-server.key" ^
        -out "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" ^
        -subj "/CN=%SERVER_IP%"
    if errorlevel 1 (
        echo GRESKA: Generisanje certifikata nije uspjelo.
        pause
        exit /b 1
    )
    echo Certifikat kreiran.
) else (
    echo Certifikat vec postoji, preskacem.
)

echo.
echo [Korak 3/6] Apache vhost konfiguracija...
set "VHOST_SRC=%PROJECT_DIR%deploy\apache\plantim-https-ip.conf"
set "VHOST_DST=%APACHE_DIR%\conf\extra\plantim-https-ip.conf"

if not exist "%VHOST_SRC%" (
    echo GRESKA: %VHOST_SRC% ne postoji.
    pause
    exit /b 1
)

powershell -NoProfile -Command "(Get-Content '%VHOST_SRC%') -replace '77\.77\.210\.70', '%SERVER_IP%' | Set-Content '%VHOST_DST%' -Encoding UTF8"
echo Kopirano: %VHOST_DST%

echo.
echo [Korak 4/6] Ukljucivanje SSL modula u httpd.conf...
if not exist "%HTTPD_CONF%" (
    echo GRESKA: %HTTPD_CONF% ne postoji.
    pause
    exit /b 1
)

copy /Y "%HTTPD_CONF%" "%HTTPD_CONF%.plantim-backup" >nul

powershell -NoProfile -Command ^
  "$c = Get-Content '%HTTPD_CONF%';" ^
  "$c = $c -replace '^#LoadModule ssl_module modules/mod_ssl.so', 'LoadModule ssl_module modules/mod_ssl.so';" ^
  "$c = $c -replace '^#LoadModule socache_shmcb_module modules/mod_socache_shmcb.so', 'LoadModule socache_shmcb_module modules/mod_socache_shmcb.so';" ^
  "if ($c -notmatch 'Include conf/extra/plantim-https-ip.conf') { $c += ''; $c += 'Include conf/extra/plantim-https-ip.conf' }" ^
  "Set-Content '%HTTPD_CONF%' $c -Encoding UTF8"

echo httpd.conf azuriran (backup: httpd.conf.plantim-backup).

echo.
echo [Korak 5/6] Windows Firewall...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\setup-windows-firewall.ps1"
if errorlevel 1 (
    echo UPOZORENJE: Firewall skripta nije uspjela — podesite rucno portove 80 i 443.
)

echo.
echo [Korak 6/6] Laravel cache i storage link...
set "PHP_PATH=%XAMPP_DIR%\php\php.exe"
if exist "%PHP_PATH%" (
    cd /d "%PROJECT_DIR%"
    if exist ".env" (
        "%PHP_PATH%" artisan storage:link 2>nul
        "%PHP_PATH%" artisan config:cache
        "%PHP_PATH%" artisan route:cache
    ) else (
        echo UPOZORENJE: .env ne postoji — kopirajte deploy\env.production.ip.example u .env
    )
)

echo.
echo ========================================
echo SETUP ZAVRSEN — RUCNI KORACI ISPOD
echo ========================================
echo.
echo 1. Provjerite .env (kopirajte deploy\env.production.ip.example):
echo    APP_URL=https://%SERVER_IP%
echo    CORS_ALLOWED_ORIGINS=https://%SERVER_IP%
echo.
echo 2. XAMPP Control Panel: STOP pa START Apache
echo.
echo 3. Otvorite u browseru: https://%SERVER_IP%/login
echo    (bez :5173 — prvi put prihvatite self-signed certifikat)
echo.
echo 4. Zaustavite npm run dev ako je pokrenut — vise nije potreban.
echo.
echo 5. reCAPTCHA: postavite prave kljuceve u .env (ne test kljuceve).
echo.
echo Detalji: docs\WINDOWS_SERVER_HTTPS.md
echo.
pause
