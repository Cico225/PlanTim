@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Brza popravka: login greska "route auth/login could not be found"
REM Opcija: FIX_API_ROUTING.bat --no-pause

set "NO_PAUSE=0"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

set "PROJECT_DIR=%~dp0"
set "APACHE_DIR=C:\xampp\apache"
set "SERVER_IP=192.168.1.126"

if exist "%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$t=Get-Content '%PROJECT_DIR%TRENUTNA_IP_ADRESA.txt' -Raw; if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }"`) do set "SERVER_IP=%%I"
)

echo Popravka API rutiranja za IP !SERVER_IP!...

powershell -NoProfile -Command "(Get-Content '%PROJECT_DIR%deploy\apache\plantim-https-ip.conf') -replace '77\.77\.210\.70', '!SERVER_IP!' | Set-Content '%APACHE_DIR%\conf\extra\plantim-https-ip.conf' -Encoding UTF8"

copy /Y "%PROJECT_DIR%frontend\dist\.htaccess" "%PROJECT_DIR%frontend\dist\.htaccess" >nul 2>&1
if exist "%PROJECT_DIR%frontend\public\.htaccess" (
    copy /Y "%PROJECT_DIR%frontend\public\.htaccess" "%PROJECT_DIR%frontend\dist\.htaccess" >nul
)

"%APACHE_DIR%\bin\httpd.exe" -t
if errorlevel 1 (
    echo GRESKA u Apache konfiguraciji.
    pause
    exit /b 1
)

echo.
echo OK. XAMPP: Stop -^> Start Apache
echo Test: https://!SERVER_IP!/login
if "!NO_PAUSE!"=="0" pause
exit /b 0
