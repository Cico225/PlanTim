@echo off
echo ========================================
echo Starting PlanTim Servers
echo ========================================
echo.
echo Backend will start on: http://localhost:8000
echo Frontend will start on: http://localhost:5173
echo.
echo Press Ctrl+C to stop servers
echo ========================================
echo.

REM Start Laravel backend in new window
start "PlanTim Backend" cmd /k "cd /d C:\xampp\htdocs\PlanTim && echo Starting Laravel Backend... && php artisan serve"

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start React frontend in new window
start "PlanTim Frontend" cmd /k "cd /d C:\xampp\htdocs\PlanTim\frontend && echo Starting React Frontend... && npm run dev"

echo.
echo Both servers are starting...
echo Wait 5-10 seconds, then open: http://localhost:5173
echo.
pause

