@echo off
setlocal EnableExtensions
REM PlanTim — Korak 1: produkcijski build frontenda (bez npm run dev)

set PROJECT_DIR=%~dp0
set FRONTEND_DIR=%PROJECT_DIR%frontend

echo ========================================
echo PlanTim - Produkcijski frontend build
echo ========================================
echo.

cd /d "%FRONTEND_DIR%"
if errorlevel 1 (
    echo GRESKA: frontend folder ne postoji.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Node.js nije instaliran. Instalirajte Node.js LTS.
    pause
    exit /b 1
)

echo [1/3] Zaustavljanje Vite dev servera (port 5173)...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] npm paketi...
if exist "package-lock.json" (
    call npm ci
    if errorlevel 1 call npm install
) else (
    call npm install
)
if errorlevel 1 (
    echo GRESKA: npm install nije uspio.
    pause
    exit /b 1
)

echo [3/3] vite build...
call npx vite build
if errorlevel 1 (
    echo GRESKA: vite build nije uspio.
    pause
    exit /b 1
)

echo.
echo ========================================
echo USPJEH: Build je u frontend\dist\
echo ========================================
echo.
echo Sljedeci korak na serveru:
echo   SETUP_WINDOWS_HTTPS.bat
echo.
pause
