@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM PlanTim - SERVER: popravi git repo nakon restore backupa
REM (kada PULL javlja: fatal: not a git repository)
REM ============================================================

SET "GIT_PATH=C:\Program Files\Git\bin\git.exe"
SET "PROJECT_DIR=C:\xampp\htdocs\PlanTim"
SET "REMOTE_URL=https://github.com/Cico225/PlanTim.git"
SET "BACKUP_DIR=%TEMP%\plantim-git-repair-%RANDOM%"

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo GRESKA: Folder ne postoji: %PROJECT_DIR%
    pause
    exit /b 1
)

if not exist "%GIT_PATH%" (
    echo GRESKA: Git nije instaliran: %GIT_PATH%
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - Popravka Git repozitorija
echo ========================================
echo Folder: %PROJECT_DIR%
echo Remote: %REMOTE_URL%
echo.

if exist ".git" (
    echo .git vec postoji.
    "%GIT_PATH%" remote -v
    echo.
    echo Ako pull i dalje ne radi, pokrenite: PULL_FROM_GITHUB.bat
    pause
    exit /b 0
)

echo [1/5] Backup lokalnih fajlova (.env, certs, IP)...
mkdir "%BACKUP_DIR%" 2>nul
if exist ".env" copy /Y ".env" "%BACKUP_DIR%\.env" >nul
if exist "frontend\.env" copy /Y "frontend\.env" "%BACKUP_DIR%\frontend.env" >nul
if exist "PLANTIM_SERVER_IP.txt" copy /Y "PLANTIM_SERVER_IP.txt" "%BACKUP_DIR%\PLANTIM_SERVER_IP.txt" >nul
if exist "TRENUTNA_IP_ADRESA.txt" copy /Y "TRENUTNA_IP_ADRESA.txt" "%BACKUP_DIR%\TRENUTNA_IP_ADRESA.txt" >nul
if exist "frontend\certs" xcopy /E /I /Y "frontend\certs" "%BACKUP_DIR%\certs\" >nul

echo [2/5] git init...
"%GIT_PATH%" init
if errorlevel 1 (
    echo GRESKA: git init nije uspio.
    pause
    exit /b 1
)

echo [3/5] Povezivanje sa GitHubom...
"%GIT_PATH%" remote remove origin 2>nul
"%GIT_PATH%" remote add origin "%REMOTE_URL%"
if errorlevel 1 (
    echo GRESKA: git remote add nije uspio.
    pause
    exit /b 1
)

echo [4/5] git fetch origin...
"%GIT_PATH%" fetch origin
if errorlevel 1 (
    echo GRESKA: git fetch nije uspio.
    echo Provjerite internet i pristup: %REMOTE_URL%
    pause
    exit /b 1
)

echo [5/5] checkout main (uskladjenje sa GitHubom)...
"%GIT_PATH%" checkout -f -B main origin/main
if errorlevel 1 (
    echo GRESKA: checkout main nije uspio.
    pause
    exit /b 1
)

"%GIT_PATH%" branch --set-upstream-to=origin/main main 2>nul

echo.
echo Vracanje lokalnih fajlova...
if exist "%BACKUP_DIR%\.env" copy /Y "%BACKUP_DIR%\.env" ".env" >nul
if exist "%BACKUP_DIR%\frontend.env" (
    if not exist "frontend" mkdir "frontend"
    copy /Y "%BACKUP_DIR%\frontend.env" "frontend\.env" >nul
)
if exist "%BACKUP_DIR%\PLANTIM_SERVER_IP.txt" copy /Y "%BACKUP_DIR%\PLANTIM_SERVER_IP.txt" "PLANTIM_SERVER_IP.txt" >nul
if exist "%BACKUP_DIR%\TRENUTNA_IP_ADRESA.txt" copy /Y "%BACKUP_DIR%\TRENUTNA_IP_ADRESA.txt" "TRENUTNA_IP_ADRESA.txt" >nul
if exist "%BACKUP_DIR%\certs" (
    if not exist "frontend\certs" mkdir "frontend\certs"
    xcopy /E /I /Y "%BACKUP_DIR%\certs\*" "frontend\certs\" >nul
)

rmdir /S /Q "%BACKUP_DIR%" 2>nul

echo.
echo ========================================
echo USPJEH: Git repo je popravljen
echo ========================================
echo.
"%GIT_PATH%" status -sb
echo.
echo Sada pokrenite: PULL_FROM_GITHUB.bat
echo.
pause
exit /b 0
