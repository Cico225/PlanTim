@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM SSL certifikat za Vite HTTPS (frontend\certs\)

set "PROJECT_DIR=%~dp0"
set "XAMPP_DIR=C:\xampp"
set "OPENSSL=%XAMPP_DIR%\apache\bin\openssl.exe"
set "OPENSSL_CONF=%XAMPP_DIR%\apache\conf\openssl.cnf"
set "CERTS_DIR=%PROJECT_DIR%frontend\certs"
set "SERVER_IP="

set "SERVER_IP="
set "IP_TMP=%TEMP%\plantim-server-ip.txt"
del /F /Q "%IP_TMP%" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\resolve-server-ip.ps1" -OutputFile "%IP_TMP%" >nul 2>&1
if exist "%IP_TMP%" (
    set /p SERVER_IP=<"%IP_TMP%"
    del /F /Q "%IP_TMP%" 2>nul
)

if "!SERVER_IP!"=="" set /p SERVER_IP=Unesite IP servera (npr. 192.168.1.126): 

echo.
echo Generisanje Vite SSL certifikata za: !SERVER_IP!
echo.

if not exist "%OPENSSL%" (
    echo GRESKA: OpenSSL nije pronadjen: %OPENSSL%
    pause
    exit /b 1
)

if not exist "%CERTS_DIR%" mkdir "%CERTS_DIR%"

set "OPENSSL_CNF=%PROJECT_DIR%deploy\openssl\vite-ip-cert.cnf"
set "TEMP_CNF=%CERTS_DIR%\openssl-temp.cnf"

if not exist "%OPENSSL_CNF%" (
    echo GRESKA: %OPENSSL_CNF% ne postoji.
    pause
    exit /b 1
)

powershell -NoProfile -Command "(Get-Content '%OPENSSL_CNF%') -replace 'PLANTIM_SERVER_IP', '!SERVER_IP!' | Set-Content '%TEMP_CNF%' -Encoding ASCII"

set "OPENSSL_CONF=%OPENSSL_CONF%"
"%OPENSSL%" req -x509 -nodes -days 3650 -newkey rsa:2048 ^
  -config "%TEMP_CNF%" ^
  -keyout "%CERTS_DIR%\server-key.pem" ^
  -out "%CERTS_DIR%\server-cert.pem" 2>nul

del /F /Q "%TEMP_CNF%" 2>nul

if not exist "%CERTS_DIR%\server-cert.pem" (
    echo GRESKA: OpenSSL nije uspio generisati certifikat.
    pause
    exit /b 1
)

copy /Y "%CERTS_DIR%\server-key.pem" "%CERTS_DIR%\localhost-key.pem" >nul
copy /Y "%CERTS_DIR%\server-cert.pem" "%CERTS_DIR%\localhost-cert.pem" >nul

echo.
echo USPJEH: certifikati u frontend\certs\
echo.
exit /b 0
