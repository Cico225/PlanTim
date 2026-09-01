@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM PlanTim - popravka Apache SSL (dupli Listen 443 / konflikt)
REM Pokrenite kao Administrator
REM ============================================================

set "PROJECT_DIR=%~dp0"
set "XAMPP_DIR=C:\xampp"
set "APACHE_DIR=%XAMPP_DIR%\apache"
set "HTTPD_CONF=%APACHE_DIR%\conf\httpd.conf"
set "HTTPD_SSL=%APACHE_DIR%\conf\extra\httpd-ssl.conf"
set "PLANTIM_VHOST=%APACHE_DIR%\conf\extra\plantim-https-ip.conf"
set "SERVER_IP=192.168.1.126"

net session >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Pokrenite kao Administrator.
    pause
    exit /b 1
)

if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "SERVER_IP=%%I"
)

echo ========================================
echo PlanTim - FIX Apache HTTPS
echo IP: !SERVER_IP!
echo ========================================
echo.

if not exist "%HTTPD_CONF%" (
    echo GRESKA: %HTTPD_CONF% ne postoji.
    pause
    exit /b 1
)

if not exist "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" (
    echo GRESKA: SSL certifikat ne postoji.
    echo Prvo pokrenite GENERATE_SSL_CERT.bat
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%frontend\dist\index.html" (
    echo GRESKA: frontend\dist\index.html ne postoji.
    echo Pokrenite BUILD_PRODUCTION_FRONTEND.bat
    pause
    exit /b 1
)

echo [1/5] Backup httpd.conf...
if not exist "%HTTPD_CONF%.plantim-fix-backup" (
    copy /Y "%HTTPD_CONF%" "%HTTPD_CONF%.plantim-fix-backup" >nul
)

echo [2/5] Iskljucivanje default httpd-ssl.conf (dupli Listen 443)...
powershell -NoProfile -Command ^
  "$c = Get-Content '%HTTPD_CONF%';" ^
  "$c = $c -replace '^Include conf/extra/httpd-ssl.conf', '# Include conf/extra/httpd-ssl.conf  # disabled by PlanTim FIX';" ^
  "$c = $c -replace '^#LoadModule ssl_module modules/mod_ssl.so', 'LoadModule ssl_module modules/mod_ssl.so';" ^
  "$c = $c -replace '^#LoadModule socache_shmcb_module modules/mod_socache_shmcb.so', 'LoadModule socache_shmcb_module modules/mod_socache_shmcb.so';" ^
  "if ($c -notmatch 'Include conf/extra/plantim-https-ip.conf') { $c += ''; $c += 'Include conf/extra/plantim-https-ip.conf' }" ^
  "Set-Content '%HTTPD_CONF%' $c -Encoding UTF8"

echo [3/5] Kopiranje plantim vhost...
powershell -NoProfile -Command "(Get-Content '%PROJECT_DIR%deploy\apache\plantim-https-ip.conf') -replace '77\.77\.210\.70', '!SERVER_IP!' | Set-Content '%PLANTIM_VHOST%' -Encoding UTF8"

echo [4/5] Test konfiguracije (httpd -t)...
"%APACHE_DIR%\bin\httpd.exe" -t
if errorlevel 1 (
    echo.
    echo GRESKA u konfiguraciji! Pogledajte:
    echo   %APACHE_DIR%\logs\error.log
    echo.
    echo Za vracanje: RESTORE_APACHE_CONFIG.bat
    pause
    exit /b 1
)

echo [5/5] Test OK.
echo.
echo ========================================
echo Sada u XAMPP: Start Apache
echo URL: https://!SERVER_IP!/login
echo ========================================
pause
