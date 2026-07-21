@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - Instalacija Composer-a (jednokratno na serveru)
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET PROJECT_DIR=%~dp0
SET PROJECT_DIR=%PROJECT_DIR:~0,-1%

cd /d "%PROJECT_DIR%"

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    pause
    exit /b 1
)

if exist "%PROJECT_DIR%\composer.phar" (
    echo composer.phar vec postoji u projektu.
    "%PHP_PATH%" "%PROJECT_DIR%\composer.phar" --version
    pause
    exit /b 0
)

echo Preuzimanje Composer-a...
"%PHP_PATH%" -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
if errorlevel 1 (
    echo GRESKA: Preuzimanje nije uspjelo. Provjeri internet konekciju.
    pause
    exit /b 1
)

"%PHP_PATH%" composer-setup.php --install-dir="%PROJECT_DIR%" --filename=composer.phar
if errorlevel 1 (
    echo GRESKA: Instalacija Composer-a nije uspjela.
    del composer-setup.php 2>nul
    pause
    exit /b 1
)

del composer-setup.php 2>nul

echo.
echo Composer uspjesno instaliran:
"%PHP_PATH%" "%PROJECT_DIR%\composer.phar" --version
echo.
echo Lokacija: %PROJECT_DIR%\composer.phar
echo Sada pokreni: PULL_FROM_GITHUB.bat
echo.
pause
