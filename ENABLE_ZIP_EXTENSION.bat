@echo off
echo ========================================
echo Omogucavanje PHP ZIP ekstenzije
echo ========================================
echo.

set PHP_INI=C:\xampp\php\php.ini

if not exist "%PHP_INI%" (
    echo GRESKA: php.ini fajl nije pronadjen na: %PHP_INI%
    echo Molimo proverite da li je XAMPP instaliran na C:\xampp
    pause
    exit /b 1
)

echo Pronadjen php.ini fajl: %PHP_INI%
echo.

echo Provjera da li je ZIP ekstenzija vec omogucena...
findstr /C:"extension=zip" "%PHP_INI%" | findstr /V ";extension=zip" >nul
if %errorlevel% equ 0 (
    echo ZIP ekstenzija je vec omogucena!
    pause
    exit /b 0
)

echo ZIP ekstenzija nije omogucena. Omogucavam...
echo.

REM Backup php.ini fajla
copy "%PHP_INI%" "%PHP_INI%.backup" >nul
echo Kreiran backup: %PHP_INI%.backup

REM Omoguci ZIP ekstenziju - zameni ;extension=zip sa extension=zip
powershell -Command "(Get-Content '%PHP_INI%') -replace ';extension=zip', 'extension=zip' | Set-Content '%PHP_INI%'"

echo.
echo ZIP ekstenzija je omogucena!
echo.
echo ========================================
echo VAZNO: Restartujte Apache server!
echo ========================================
echo.
echo 1. Otvorite XAMPP Control Panel
echo 2. Kliknite "Stop" za Apache
echo 3. Kliknite "Start" za Apache
echo.
pause




