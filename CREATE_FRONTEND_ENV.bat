@echo off
SETLOCAL

echo ============================================
echo PlanTim - Kreiranje frontend .env fajla
echo ============================================
echo.

cd /d "%~dp0\frontend"

echo Kreiranje .env fajla u frontend folderu...
echo.

REM Create frontend .env file
(
echo VITE_API_URL=http://localhost:8000/api
echo VITE_APP_NAME=PlanTim
) > .env

echo ✓ Frontend .env fajl kreiran!
echo.
echo Sadržaj:
type .env
echo.
pause
ENDLOCAL

