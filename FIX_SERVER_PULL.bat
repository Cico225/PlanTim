@echo off
REM ============================================================
REM Jednokratni popravak: povuci develop s GitHuba (prozor ostaje otvoren)
REM Pokreni na SERVERU ako se PULL_FROM_GITHUB.bat odmah zatvori.
REM ============================================================
cd /d "%~dp0"
title PlanTim - FIX SERVER PULL
color 0E

echo.
echo ========================================
echo PlanTim - jednokratni git pull (develop)
echo Folder: %CD%
echo ========================================
echo.
echo Ako vidite ovaj tekst, prozor radi ispravno.
echo.

SET "GIT_PATH="
if exist "C:\Program Files\Git\bin\git.exe" SET "GIT_PATH=C:\Program Files\Git\bin\git.exe"
if not defined GIT_PATH if exist "C:\Program Files (x86)\Git\bin\git.exe" SET "GIT_PATH=C:\Program Files (x86)\Git\bin\git.exe"
if not defined GIT_PATH (
    where git >nul 2>&1
    if not errorlevel 1 for /f "delims=" %%G in ('where git') do SET "GIT_PATH=%%G"
)

if not defined GIT_PATH (
    echo GRESKA: Git nije pronadjen.
    echo Instalirajte Git for Windows, zatim ponovo pokrenite ovu skriptu.
    goto :end
)

echo Git: %GIT_PATH%
echo.

if not exist ".git" (
    echo GRESKA: Nema .git foldera.
    echo Prvo pokrenite: REPAIR_GIT_ON_SERVER.bat
    goto :end
)

echo [1/3] fetch origin...
"%GIT_PATH%" fetch origin
if errorlevel 1 (
    echo GRESKA: git fetch nije uspio ^(mreza / GitHub autentikacija^).
    goto :end
)

echo [2/3] checkout develop...
"%GIT_PATH%" checkout -f -B develop origin/develop
if errorlevel 1 (
    echo GRESKA: checkout develop nije uspio.
    echo Provjerite da grana develop postoji na GitHubu.
    goto :end
)

echo [3/3] reset --hard origin/develop...
"%GIT_PATH%" reset --hard origin/develop
if errorlevel 1 (
    echo GRESKA: reset nije uspio.
    goto :end
)

echo.
echo OK - kod je uskladjen sa origin/develop.
echo Sada pokrenite: PULL_FROM_GITHUB.bat
echo ^(ta skripta radi composer, npm, migrate...^)
echo.

:end
echo.
pause
