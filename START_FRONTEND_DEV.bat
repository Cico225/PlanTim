@echo off
setlocal EnableExtensions
REM Pokrece Vite HTTPS na :5173 (zove ga START_ALL_AUTO_NETWORK.bat)

set "FRONTEND_DIR=%~dp0frontend"
set "NODE_DIR=C:\Program Files\nodejs"

if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%APPDATA%\npm;%PATH%"
)

cd /d "%FRONTEND_DIR%"
if errorlevel 1 (
    echo GRESKA: Ne postoji folder: %FRONTEND_DIR%
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo GRESKA: Vite nije instaliran.
    echo Pokrenite: INSTALL_FRONTEND_DEPS.bat
    pause
    exit /b 1
)

echo.
echo PlanTim Frontend - Vite HTTPS
echo Folder: %CD%
echo URL:    https://0.0.0.0:5173
echo.
call node_modules\.bin\vite.cmd --host 0.0.0.0 --port 5173
echo.
echo Vite je zaustavljen.
pause
