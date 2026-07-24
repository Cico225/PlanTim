@echo off
setlocal EnableExtensions

REM ============================================================
REM PlanTim - LAPTOP: posalji nove verzije na GitHub (develop)
REM ============================================================

SET PHP_PATH=C:\xampp\php\php.exe
SET GIT_PATH=C:\Program Files\Git\bin\git.exe
SET PROJECT_DIR=C:\xampp\htdocs\PlanTim

cd /d "%PROJECT_DIR%"
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: Folder projekta ne postoji: %PROJECT_DIR%
    pause
    exit /b 1
)

if not exist "%GIT_PATH%" (
    echo GRESKA: Git nije pronadjen: %GIT_PATH%
    echo Instaliraj Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen: %PHP_PATH%
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - PUSH na GitHub (develop)
echo ========================================
echo.

echo [1/6] Prebacivanje na develop...
"%GIT_PATH%" checkout develop
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: checkout develop nije uspio.
    pause
    exit /b 1
)

echo.
echo [2/6] Povlacenje najnovijeg s GitHuba...
"%GIT_PATH%" pull origin develop
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: git pull nije uspio. Rijesi konflikte pa pokusaj ponovo.
    pause
    exit /b 1
)

echo.
echo [3/6] Pregled promjena...
"%GIT_PATH%" status --short
echo.

"%GIT_PATH%" diff --quiet
if %ERRORLEVEL% EQU 0 (
    "%GIT_PATH%" diff --cached --quiet
    if %ERRORLEVEL% EQU 0 (
        echo Nema novih promjena za commit.
        echo.
        echo Sljedeci korak na serveru:
        echo   1. Merge develop -^> main na GitHubu
        echo   2. Pokreni PULL_FROM_GITHUB.bat na serveru
        pause
        exit /b 0
    )
)

set "COMMIT_MSG="
set /p COMMIT_MSG=Unesi opis promjene (commit poruka): 

if "%COMMIT_MSG%"=="" (
    echo GRESKA: Commit poruka je obavezna.
    pause
    exit /b 1
)

echo.
echo [4/6] Automatsko povecanje verzije...
"%PHP_PATH%" artisan app:version-bump --message="%COMMIT_MSG%" --sync
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: app:version-bump nije uspio.
    pause
    exit /b 1
)

echo.
echo [5/6] Commit...
"%GIT_PATH%" add .
"%GIT_PATH%" commit -m "v: %COMMIT_MSG%"
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: commit nije uspio.
    pause
    exit /b 1
)

echo.
echo [6/6] Push na GitHub...
"%GIT_PATH%" push origin develop
if %ERRORLEVEL% NEQ 0 (
    echo GRESKA: push nije uspio.
    echo Provjeri GitHub login (Cico225 + Personal Access Token).
    pause
    exit /b 1
)

echo.
echo ========================================
echo Uspjesno poslano na GitHub (develop)!
echo ========================================
echo.
echo Verzija je automatski povecana i sinkronizovana na laptopu.
echo Sljedeci koraci:
echo   1. Testiraj aplikaciju na laptopu
echo   2. Na GitHubu: Pull Request develop -^> main (merge)
echo   3. Na serveru pokreni: PULL_FROM_GITHUB.bat
echo.
echo GitHub: https://github.com/Cico225/PlanTim
echo.
pause
