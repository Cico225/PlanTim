@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Generise SSL certifikat (XAMPP openssl.cnf, ne C:\Apache24)

set "XAMPP_DIR=C:\xampp"
set "APACHE_DIR=%XAMPP_DIR%\apache"
set "OPENSSL=%APACHE_DIR%\bin\openssl.exe"
set "OPENSSL_CONF=%APACHE_DIR%\conf\openssl.cnf"
set "PROJECT_DIR=%~dp0"
set "SERVER_IP="

if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "SERVER_IP=%%I"
)
if "!SERVER_IP!"=="" set /p SERVER_IP=Unesite IP servera: 

echo.
echo IP: !SERVER_IP!
echo OPENSSL: %OPENSSL%
echo OPENSSL_CONF: %OPENSSL_CONF%
echo.

if not exist "%OPENSSL_CONF%" (
    echo GRESKA: openssl.cnf nije na %OPENSSL_CONF%
    pause
    exit /b 1
)

if not exist "%APACHE_DIR%\conf\ssl.crt" mkdir "%APACHE_DIR%\conf\ssl.crt"
if not exist "%APACHE_DIR%\conf\ssl.key" mkdir "%APACHE_DIR%\conf\ssl.key"

REM Forsiraj XAMPP config (ignorisi C:\Apache24 iz sistema)
set "OPENSSL_CONF=%OPENSSL_CONF%"

"%OPENSSL%" req -x509 -nodes -days 3650 -newkey rsa:2048 ^
    -config "%OPENSSL_CONF%" ^
    -keyout "%APACHE_DIR%\conf\ssl.key\plantim-server.key" ^
    -out "%APACHE_DIR%\conf\ssl.crt\plantim-server.crt" ^
    -subj "/CN=!SERVER_IP!"

if errorlevel 1 (
    echo.
    echo GRESKA. Ako vidite C:\Apache24 — u CMD prvo pokrenite:
    echo   set OPENSSL_CONF=C:\xampp\apache\conf\openssl.cnf
    echo pa ponovo ovu skriptu.
    pause
    exit /b 1
)

echo.
echo USPJEH: certifikat kreiran za !SERVER_IP!
echo Nastavite: SETUP_WINDOWS_HTTPS.bat --skip-build
pause
