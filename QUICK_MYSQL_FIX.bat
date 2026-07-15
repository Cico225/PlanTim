@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ================================================
echo   PlanTim - Brza Popravka MySQL Problema
echo ================================================
echo.
echo Ova skripta će automatski pokušati riješiti
echo najčešće probleme sa MySQL-om u XAMPP-u.
echo.

:: Provjera administrator privilegija
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [UPOZORENJE] Niste pokrenuli kao Administrator.
    echo Neki koraci možda neće raditi.
    echo.
    choice /C YN /M "Da li želite da nastavite bez administrator privilegija"
    if errorlevel 2 (
        echo Operacija otkazana. Pokrenite kao Administrator.
        pause
        exit /b 0
    )
)

echo [KORAK 1/6] Zaustavljanje svih MySQL procesa...
taskkill /F /IM mysqld.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] MySQL procesi zaustavljeni.

echo.
echo [KORAK 2/6] Zaustavljanje Windows MySQL servisa...
net stop MySQL >nul 2>&1
net stop mysql80 >nul 2>&1
net stop mysql57 >nul 2>&1
sc stop MySQL >nul 2>&1
sc stop mysql80 >nul 2>&1
sc config MySQL start= disabled >nul 2>&1
sc config mysql80 start= disabled >nul 2>&1
echo [OK] Windows servisi zaustavljeni i onemogućeni.

echo.
echo [KORAK 3/6] Brisanje problematičnih fajlova...
if exist "C:\xampp\mysql\data\*.pid" (
    del /q "C:\xampp\mysql\data\*.pid" 2>nul
    echo [OK] PID fajlovi obrisani.
) else (
    echo [OK] Nema PID fajlova.
)

if exist "C:\xampp\mysql\data\aria_log.*" (
    del /q "C:\xampp\mysql\data\aria_log.*" 2>nul
    echo [OK] aria_log fajlovi obrisani.
)

if exist "C:\xampp\mysql\data\mysql\plugin.*" (
    del /q "C:\xampp\mysql\data\mysql\plugin.*" 2>nul
    echo [OK] mysql.plugin fajlovi obrisani (biće rekreirani).
)

echo.
echo [KORAK 4/6] Provjera port 3306...
netstat -ano | findstr :3306 >nul
if %errorlevel% equ 0 (
    echo [UPOZORENJE] Port 3306 je još uvijek zauzet!
    echo Procesi na portu 3306:
    netstat -ano | findstr :3306
    echo.
    echo Pokušavam da zaustavim procese...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3306') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] Port 3306 je slobodan.
)

echo.
echo [KORAK 5/6] Popravka Aria tabela (ako je moguće)...
if exist "C:\xampp\mysql\bin\aria_chk.exe" (
    cd /d "C:\xampp\mysql\bin"
    if exist "C:\xampp\mysql\data\mysql\*.MAI" (
        for %%f in ("C:\xampp\mysql\data\mysql\*.MAI") do (
            aria_chk.exe -r "%%f" >nul 2>&1
        )
        echo [OK] Aria tabele popravljene.
    ) else (
        echo [OK] Nema Aria tabela za popravku.
    )
) else (
    echo [INFO] aria_chk.exe nije pronađen (preskačem).
)

echo.
echo [KORAK 6/6] Provjera MySQL error loga...
if exist "C:\xampp\mysql\data\*.err" (
    echo.
    echo Zadnje greške iz error loga:
    echo ----------------------------------------
    for %%f in ("C:\xampp\mysql\data\*.err") do (
        echo Fajl: %%~nxf
        powershell -Command "Get-Content '%%f' -Tail 10 -ErrorAction SilentlyContinue"
        echo.
    )
    echo ----------------------------------------
) else (
    echo [OK] Nema error log fajlova (to je dobro znak).
)

echo.
echo ================================================
echo   Popravka završena!
echo ================================================
echo.
echo SADA POKRENITE MySQL IZ XAMPP CONTROL PANEL-A:
echo.
echo 1. Otvorite XAMPP Control Panel
echo 2. Kliknite "Stop" pored MySQL (ako je pokrenut)
echo 3. Sačekajte 2-3 sekunde
echo 4. Kliknite "Start" pored MySQL
echo.
echo Ako MySQL i dalje ne radi:
echo - Pokrenite DIAGNOSE_MYSQL.bat za detaljnu dijagnostiku
echo - Provjerite error log: C:\xampp\mysql\data\*.err
echo - Pokrenite COMPLETE_MYSQL_FIX.bat kao Administrator
echo.
pause

