@echo off
chcp 65001 >nul
title Test Admin Statistika - PlanTim
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║         TEST ADMIN STATISTIKA - PlanTim                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo [1/5] Provjera MySQL servera...
netstat -an | findstr ":3306" >nul
if %ERRORLEVEL% == 0 (
    echo ✓ MySQL radi
) else (
    echo ✗ MySQL nije pokrenut - Pokrenite XAMPP
    pause
    exit /b 1
)

echo.
echo [2/5] Provjera Backend servera...
netstat -an | findstr ":8000" >nul
if %ERRORLEVEL% == 0 (
    echo ✓ Backend radi
) else (
    echo ✗ Backend nije pokrenut - Pokrenite START_BACKEND.bat
    pause
    exit /b 1
)

echo.
echo [3/5] Provjera Frontend servera...
netstat -an | findstr ":5173" >nul
if %ERRORLEVEL% == 0 (
    echo ✓ Frontend radi
) else (
    echo ✗ Frontend nije pokrenut - Pokrenite START_FRONTEND.bat
    pause
    exit /b 1
)

echo.
echo [4/5] Provjera baze podataka...
C:\xampp\mysql\bin\mysql.exe -u root -e "USE plantim; SELECT COUNT(*) as total_users FROM users;" 2>nul
if %ERRORLEVEL% == 0 (
    echo ✓ Baza podataka 'plantim' postoji
) else (
    echo ✗ Baza podataka nije kreirana
    echo   Pokrenite: mysql -u root ^< create_database.sql
    pause
    exit /b 1
)

echo.
echo [5/5] Provjera personal_access_tokens tabele...
C:\xampp\mysql\bin\mysql.exe -u root -e "USE plantim; DESCRIBE personal_access_tokens;" 2>nul
if %ERRORLEVEL% == 0 (
    echo ✓ Tabela 'personal_access_tokens' postoji
) else (
    echo ✗ Tabela 'personal_access_tokens' ne postoji
    echo   Pokrenite: php artisan migrate
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                  ✓ SVE PROVJERE PROŠLE                   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Pristupite admin panelu:
echo   http://localhost:5173
echo.
echo Prijavite se:
echo   Email:    admin@plantim.com
echo   Password: password
echo.
echo Idite na: Administracija → Trebali biste vidjeti realne statistike
echo.
echo Statistike koje će biti prikazane:
echo   • Ukupno Korisnika (iz baze)
echo   • Aktivnih Sesija (online korisnici)
echo   • Sistem Uptime (dani od početka)
echo   • DB Veličina (MB/GB)
echo.

pause



