@echo off
echo ========================================
echo PlanTim - Fix MariaDB localhost Permissions
echo ========================================
echo.
echo Ova skripta će dodati dozvole za root@localhost
echo.

SET MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

if not exist "%MYSQL_PATH%" (
    echo ERROR: MySQL nije pronadjen na: %MYSQL_PATH%
    echo Molimo provjerite da li je XAMPP instaliran.
    pause
    exit /b 1
)

echo Pokretanje SQL komandi...
echo.

"%MYSQL_PATH%" -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY '' WITH GRANT OPTION;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Dozvola za root@localhost dodana
) else (
    echo ⚠ Možda dozvola već postoji ili postoji greška
)

"%MYSQL_PATH%" -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' IDENTIFIED BY '' WITH GRANT OPTION;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Dozvola za root@127.0.0.1 dodana
) else (
    echo ⚠ Možda dozvola već postoji ili postoji greška
)

"%MYSQL_PATH%" -u root -e "FLUSH PRIVILEGES;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Privilegije osvježene
) else (
    echo ✗ Greška pri osvježavanju privilegija
)

echo.
echo ========================================
echo Provjera dozvola...
echo ========================================
echo.

"%MYSQL_PATH%" -u root -e "SELECT Host, User FROM mysql.user WHERE User='root';" 2>nul

echo.
echo ========================================
if %errorlevel% equ 0 (
    echo ✓ Dozvole su uspješno dodane!
    echo.
    echo Sada pokrenite:
    echo   1. php artisan config:clear
    echo   2. Restartujte backend server
    echo   3. Pokušajte ponovo prijaviti
) else (
    echo ⚠ Postoji problem. Pokušajte ručno u phpMyAdmin.
    echo.
    echo Alternativno, pokrenite SQL skriptu ručno u phpMyAdmin:
    echo   - Otvorite: http://localhost/phpmyadmin
    echo   - Kliknite na SQL tab
    echo   - Kopirajte sadržaj iz: fix_mariadb_localhost.sql
    echo   - Kliknite Go
)

echo.
pause

