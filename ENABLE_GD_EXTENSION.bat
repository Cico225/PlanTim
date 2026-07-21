@echo off
echo ========================================
echo Omogucavanje PHP GD ekstenzije
echo ========================================
echo.

set PHP_INI=C:\xampp\php\php.ini
set PHP_PATH=C:\xampp\php\php.exe

if not exist "%PHP_INI%" (
    echo GRESKA: php.ini nije pronadjen: %PHP_INI%
    pause
    exit /b 1
)

echo Provjera GD ekstenzije...
"%PHP_PATH%" -m | findstr /I /C:"gd" >nul
if %errorlevel% equ 0 (
    echo GD ekstenzija je vec omogucena.
    pause
    exit /b 0
)

echo GD nije omogucena. Omogucavam u php.ini...
copy "%PHP_INI%" "%PHP_INI%.backup_gd" >nul
echo Backup: %PHP_INI%.backup_gd

powershell -Command "(Get-Content '%PHP_INI%') -replace ';extension=gd', 'extension=gd' | Set-Content '%PHP_INI%'"
powershell -Command "(Get-Content '%PHP_INI%') -replace ';extension=gd2', 'extension=gd2' | Set-Content '%PHP_INI%'"

echo.
echo GD ekstenzija omogucena u php.ini.
echo.
echo ========================================
echo VAZNO: Restartuj Apache u XAMPP-u!
echo ========================================
echo 1. XAMPP Control Panel - Stop Apache
echo 2. Start Apache
echo.
echo Provjera:
"%PHP_PATH%" -m | findstr /I gd
echo.
pause
