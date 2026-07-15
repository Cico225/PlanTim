@echo off
echo ============================================
echo PlanTim - Network Start
echo ============================================
echo.
echo IP Adresa: 192.168.1.204
echo Backend:  http://192.168.1.204:8000
echo Frontend: http://192.168.1.204:5173
echo.
echo Sa mobilnog/drugog racunara:
echo http://192.168.1.204:5173
echo.
echo ============================================
echo.

REM Start Backend
start "PlanTim Backend" cmd /k "cd /d %~dp0 && C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=8000"

timeout /t 3 /nobreak >nul

REM Start Frontend
start "PlanTim Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host 0.0.0.0"

echo.
echo ============================================
echo Serveri pokrenuti
echo ============================================
echo.
echo Pristup:
echo   - Sa ovog racunara: http://localhost:5173
echo   - Sa mobilnog/drugog: http://192.168.1.204:5173
echo.
echo Login:
echo   Email:    admin@plantim.com
echo   Password: password
echo.
pause
