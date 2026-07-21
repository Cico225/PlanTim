@echo off
setlocal EnableExtensions

SET PHP_PATH=C:\xampp\php\php.exe

echo ========================================
echo PlanTim - Provjera PHP ekstenzija
echo ========================================
echo.

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    pause
    exit /b 1
)

set MISSING=0

call :check_ext gd
call :check_ext zip
call :check_ext mbstring
call :check_ext openssl
call :check_ext pdo_mysql
call :check_ext fileinfo
call :check_ext curl

echo.
if %MISSING% equ 0 (
    echo Sve potrebne ekstenzije su omogucene.
) else (
    echo Nedostaje %MISSING% ekstenzija/e.
    echo Pokreni: ENABLE_GD_EXTENSION.bat
    echo Pokreni: ENABLE_ZIP_EXTENSION.bat
    exit /b 1
)

echo.
pause
exit /b 0

:check_ext
"%PHP_PATH%" -m | findstr /I /X /C:"%~1" >nul
if errorlevel 1 (
    echo [X] %~1 - NEDOSTAJE
    set /a MISSING+=1
) else (
    echo [OK] %~1
)
goto :eof
