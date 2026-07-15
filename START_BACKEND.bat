@echo off
SET PHP_PATH=C:\xampp\php\php.exe

echo Starting PlanTim Backend...
echo Backend URL: http://localhost:8000
echo Press Ctrl+C to stop
echo.

cd /d C:\xampp\htdocs\PlanTim
%PHP_PATH% artisan serve

pause

