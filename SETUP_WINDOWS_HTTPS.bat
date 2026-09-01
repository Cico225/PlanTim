@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM PlanTim - HTTPS setup za Windows Server (samo IP adresa)
REM Pokrenite kao Administrator
REM Opcija: SETUP_WINDOWS_HTTPS.bat --skip-build  (preskoci npm build)
REM ============================================================

set "PROJECT_DIR=%~dp0"
set "XAMPP_DIR=C:\xampp"
set "APACHE_DIR=%XAMPP_DIR%\apache"
set "OPENSSL=%APACHE_DIR%\bin\openssl.exe"
set "OPENSSL_CONF=%APACHE_DIR%\conf\openssl.cnf"
set "HTTPD_CONF=%APACHE_DIR%\conf\httpd.conf"
set "SERVER_IP="
set "SKIP_BUILD=0"
if /I "%~1"=="--skip-build" set "SKIP_BUILD=1"

net session >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Pokrenite kao Administrator.
    pause
    exit /b 1
)

call :resolve_server_ip
if "!SERVER_IP!"=="" (
    echo GRESKA: Nije moguce odrediti IP adresu servera.
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - HTTPS setup (Windows Server)
echo IP: !SERVER_IP!
echo ========================================
echo.

if not exist "%XAMPP_DIR%" (
    echo GRESKA: XAMPP nije na %XAMPP_DIR%
    pause
    exit /b 1
)

if "!SKIP_BUILD!"=="0" (
    echo [Korak 1/6] Produkcijski frontend build...
    call "%PROJECT_DIR%BUILD_PRODUCTION_FRONTEND.bat"
    if errorlevel 1 exit /b 1
) else (
    echo [Korak 1/6] Preskocen build (--skip-build)
)

echo.
echo [Korak 2/6] SSL certifikat...
call :generate_ssl_cert
if errorlevel 1 exit /b 1

echo.
echo [Korak 3/6] Apache vhost...
set "VHOST_SRC=%PROJECT_DIR%deploy\apache\plantim-https-ip.conf"
set "VHOST_DST=%APACHE_DIR%\conf\extra\plantim-https-ip.conf"
if not exist "%VHOST_SRC%" (
    echo GRESKA: %VHOST_SRC% ne postoji.
    pause
    exit /b 1
)
powershell -NoProfile -Command "(Get-Content '%VHOST_SRC%') -replace '77\.77\.210\.70', '!SERVER_IP!' | Set-Content '%VHOST_DST%' -Encoding UTF8"
echo Kopirano: %VHOST_DST%

echo.
echo [Korak 4/6] httpd.conf (SSL modul)...
copy /Y "%HTTPD_CONF%" "%HTTPD_CONF%.plantim-backup" >nul
powershell -NoProfile -Command "$c = Get-Content '%HTTPD_CONF%'; $c = $c -replace '^#LoadModule ssl_module modules/mod_ssl.so', 'LoadModule ssl_module modules/mod_ssl.so'; $c = $c -replace '^#LoadModule socache_shmcb_module modules/mod_socache_shmcb.so', 'LoadModule socache_shmcb_module modules/mod_socache_shmcb.so'; if ($c -notmatch 'Include conf/extra/plantim-https-ip.conf') { $c += ''; $c += 'Include conf/extra/plantim-https-ip.conf' }; Set-Content '%HTTPD_CONF%' $c -Encoding UTF8"

echo.
echo [Korak 5/6] Firewall...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\setup-windows-firewall.ps1"

echo.
echo [Korak 6/6] Laravel cache...
set "PHP_PATH=%XAMPP_DIR%\php\php.exe"
if exist "%PHP_PATH%" if exist "%PROJECT_DIR%.env" (
    cd /d "%PROJECT_DIR%"
    "%PHP_PATH%" artisan storage:link 2>nul
    "%PHP_PATH%" artisan config:cache
    "%PHP_PATH%" artisan route:cache
)

echo.
echo ========================================
echo SETUP ZAVRSEN
echo ========================================
echo Otvorite: https://!SERVER_IP!/login
echo XAMPP: Stop -^> Start Apache
echo.
pause
exit /b 0

:resolve_server_ip
if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "SERVER_IP=%%I"
)
if not "!SERVER_IP!"=="" exit /b 0
set /p SERVER_IP=Unesite IP servera (npr. 192.168.1.126): 
exit /b 0

:generate_ssl_cert
if not exist "%APACHE_DIR%\conf\ssl.crt" mkdir "%APACHE_DIR%\conf\ssl.crt"
if not exist "%APACHE_DIR%\conf\ssl.key" mkdir "%APACHE_DIR%\conf\ssl.key"
if not exist "%OPENSSL%" (
    echo GRESKA: %OPENSSL% ne postoji.
    exit /b 1
)
if not exist "%OPENSSL_CONF%" (
    echo GRESKA: %OPENSSL_CONF% ne postoji.
    exit /b 1
)
REM Ukloni pogresan sistemski OPENSSL_CONF (C:\Apache24\...)
set "OPENSSL_CONF=%OPENSSL_CONF%"
if exist "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" (
    echo Certifikat vec postoji. Za novi certifikat pokrenite GENERATE_SSL_CERT.bat
    exit /b 0
)
echo OPENSSL_CONF=%OPENSSL_CONF%
"%OPENSSL%" req -x509 -nodes -days 3650 -newkey rsa:2048 -config "%OPENSSL_CONF%" -keyout "%APACHE_DIR%\conf\ssl.key\plantim-server.key" -out "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" -subj "/CN=!SERVER_IP!"
if errorlevel 1 (
    echo GRESKA: OpenSSL nije uspio. Pokusajte GENERATE_SSL_CERT.bat
    exit /b 1
)
echo Certifikat kreiran.
exit /b 0
