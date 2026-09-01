@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM SSL certifikat za Vite HTTPS (frontend\certs\)

set "PROJECT_DIR=%~dp0"
set "XAMPP_DIR=C:\xampp"
set "OPENSSL=%XAMPP_DIR%\apache\bin\openssl.exe"
set "OPENSSL_CONF=%XAMPP_DIR%\apache\conf\openssl.cnf"
set "CERTS_DIR=%PROJECT_DIR%frontend\certs"
set "SERVER_IP="

if exist "%PROJECT_DIR%PLANTIM_SERVER_IP.txt" (
    set /p SERVER_IP=<"%PROJECT_DIR%PLANTIM_SERVER_IP.txt"
)
if "!SERVER_IP!"=="" if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "SERVER_IP=%%I"
)
if "!SERVER_IP!"=="" (
  for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "IP_RAW=%%a"
    goto :found_ip
  )
  :found_ip
  for /f "tokens=* delims= " %%a in ("!IP_RAW!") do set "SERVER_IP=%%a"
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

powershell -NoProfile -Command "(Get-Content '%OPENSSL_CNF%') -replace 'PLANTIM_SERVER_IP', '!SERVER_IP!' | Set-Content '%TEMP_CNF%' -Encoding ASCII"

set "OPENSSL_CONF=%OPENSSL_CONF%"
"%OPENSSL%" req -x509 -nodes -days 3650 -newkey rsa:2048 ^
  -config "%TEMP_CNF%" ^
  -keyout "%CERTS_DIR%\server-key.pem" ^
  -out "%CERTS_DIR%\server-cert.pem"

del /F /Q "%TEMP_CNF%" 2>nul

if errorlevel 1 (
    echo GRESKA: OpenSSL nije uspio generisati certifikat.
    pause
    exit /b 1
)

copy /Y "%CERTS_DIR%\server-key.pem" "%CERTS_DIR%\localhost-key.pem" >nul
copy /Y "%CERTS_DIR%\server-cert.pem" "%CERTS_DIR%\localhost-cert.pem" >nul

echo.
echo USPJEH: certifikati u frontend\certs\
echo   server-cert.pem / server-key.pem
echo.
echo Browser ce prikazati upozorenje (samopotpisani cert).
echo Kliknite Advanced -^> Accept the Risk and Continue.
echo.
exit /b 0
