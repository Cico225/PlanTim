@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title PlanTim - Instalacija frontend paketa

cd /d "%~dp0"

set "NODE_DIR=C:\Program Files\nodejs"
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%APPDATA%\npm;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Node.js nije instaliran.
    echo Preuzmite Node.js LTS sa https://nodejs.org
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo GRESKA: frontend\package.json ne postoji.
    pause
    exit /b 1
)

echo ========================================
echo PlanTim - npm install (frontend)
echo ========================================
echo.
echo Ovo je potrebno nakon restore backupa.
echo Moze potrajati 2-10 minuta...
echo.

pushd "%~dp0frontend"

if exist "package-lock.json" (
    echo Pokusavam npm ci...
    call npm ci
    if errorlevel 1 (
        echo npm ci nije uspio, pokusavam npm install...
        call npm install
    )
) else (
    call npm install
)

if errorlevel 1 (
    echo.
    echo GRESKA: npm install nije uspio.
    popd
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo.
    echo GRESKA: vite i dalje nije instaliran.
    popd
    pause
    exit /b 1
)

popd

echo.
echo ========================================
echo USPJEH: frontend paketi instalirani
echo ========================================
echo.
echo Sada pokrenite: START_ALL_AUTO_NETWORK.bat
echo.
pause
exit /b 0
