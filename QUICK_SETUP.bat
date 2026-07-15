@echo off
echo ========================================
echo PlanTim - Quick Setup Script
echo ========================================
echo.

REM Navigate to project directory
cd /d C:\xampp\htdocs\PlanTim

echo [1/5] Generating Application Key...
php artisan key:generate
echo.

echo [2/5] Running Database Migrations...
php artisan migrate --force
echo.

echo [3/5] Seeding Database...
php artisan db:seed --force
echo.

echo [4/5] Clearing Cache...
php artisan config:clear
php artisan cache:clear
php artisan route:clear
echo.

echo [5/5] Optimizing...
php artisan optimize
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Default Login Credentials:
echo Email: admin@plantim.local
echo Password: password
echo.
echo To start the application:
echo 1. Run: php artisan serve
echo 2. In new terminal: cd frontend ^&^& npm run dev
echo 3. Open browser: http://localhost:5173
echo.
pause

