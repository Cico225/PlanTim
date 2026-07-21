@echo off
echo ========================================
echo PlanTim - Omoguci PHP ekstenzije (XAMPP)
echo ========================================
echo.

set PHP_INI=C:\xampp\php\php.ini
set PHP_PATH=C:\xampp\php\php.exe

if not exist "%PHP_INI%" (
    echo GRESKA: php.ini nije pronadjen: %PHP_INI%
    pause
    exit /b 1
)

copy "%PHP_INI%" "%PHP_INI%.backup_extensions" >nul
echo Backup php.ini: %PHP_INI%.backup_extensions
echo.

echo Omogucavam ekstenzije...
powershell -Command "$c = Get-Content '%PHP_INI%'; $c = $c -replace ';extension=gd', 'extension=gd' -replace ';extension=gd2', 'extension=gd2' -replace ';extension=zip', 'extension=zip' -replace ';extension=curl', 'extension=curl' -replace ';extension=fileinfo', 'extension=fileinfo' -replace ';extension=mbstring', 'extension=mbstring' -replace ';extension=openssl', 'extension=openssl' -replace ';extension=pdo_mysql', 'extension=pdo_mysql'; Set-Content '%PHP_INI%' $c"

echo.
echo Provjera:
call "%~dp0CHECK_PHP_EXTENSIONS.bat"
