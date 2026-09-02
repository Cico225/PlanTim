@echo off
SETLOCAL EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title PlanTim - HTTPS pokretanje (mreza)
color 0A

echo.
echo ============================================================
echo   PlanTim - HTTPS pokretanje (https://IP:5173)
echo ============================================================
echo.

cd /d "%~dp0"

SET "PHP_PATH=C:\xampp\php\php.exe"
SET "NODE_DIR=C:\Program Files\nodejs"
SET "LOG_FILE=%~dp0storage\logs\start-network.log"

if not exist "%PHP_PATH%" (
    echo GRESKA: PHP nije pronadjen na %PHP_PATH%
    echo Instalirajte XAMPP na C:\xampp
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo GRESKA: frontend\package.json ne postoji.
    pause
    exit /b 1
)

REM Node.js PATH (bitno kad se pokrece duplim klikom iz Explorera)
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%APPDATA%\npm;%PATH%"
)
where node >nul 2>&1
if errorlevel 1 (
    echo GRESKA: Node.js nije pronadjen u PATH-u.
    echo Instalirajte Node.js LTS ili dodajte C:\Program Files\nodejs u PATH.
    pause
    exit /b 1
)

if not exist "frontend\node_modules\.bin\vite.cmd" (
    echo [KORAK 0] Vite nije instaliran - npm install...
    echo Nakon restore backupa ovo je normalno. Pricekajte...
    pushd "%~dp0frontend"
    if exist "package-lock.json" (
        call npm ci
        if errorlevel 1 call npm install
    ) else (
        call npm install
    )
    if errorlevel 1 (
        echo GRESKA: npm install nije uspio.
        echo Pokrenite rucno: INSTALL_FRONTEND_DEPS.bat
        popd
        pause
        exit /b 1
    )
    if not exist "node_modules\.bin\vite.cmd" (
        echo GRESKA: vite nije pronadjen nakon npm install.
        echo Pokrenite: INSTALL_FRONTEND_DEPS.bat
        popd
        pause
        exit /b 1
    )
    popd
    echo.
)

if not exist "frontend\certs\server-cert.pem" (
    echo [KORAK 0] SSL certifikat ne postoji — generisanje...
    call "%~dp0GENERATE_VITE_SSL_CERT.bat"
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

echo [KORAK 1] Azuriranje mrezne konfiguracije...
call "%~dp0UPDATE_NETWORK_CONFIG.bat" --no-pause
if errorlevel 1 (
    echo GRESKA: UPDATE_NETWORK_CONFIG.bat nije uspio.
    pause
    exit /b 1
)

"%PHP_PATH%" artisan config:clear >nul 2>&1

set "LOCAL_IP="
set "IP_TMP=%TEMP%\plantim-server-ip.txt"
del /F /Q "%IP_TMP%" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\resolve-server-ip.ps1" -OutputFile "%IP_TMP%" >nul 2>&1
if exist "%IP_TMP%" (
    set /p LOCAL_IP=<"%IP_TMP%"
    del /F /Q "%IP_TMP%" 2>nul
)

if "!LOCAL_IP!"=="" (
    echo GRESKA: IP adresa nije odredjena.
    pause
    exit /b 1
)

echo.
echo [KORAK 2] MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if errorlevel 1 (
    echo Pokretanje MySQL...
    if exist "C:\xampp\mysql_start.bat" (
        start "" /MIN "C:\xampp\mysql_start.bat"
        timeout /t 5 /nobreak >nul
    ) else (
        echo UPOZORENJE: Pokrenite MySQL iz XAMPP Control Panel-a.
    )
) else (
    echo MySQL je aktivan.
)

echo.
echo [KORAK 3] Backend (Laravel artisan serve)...
netstat -an | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo Port 8000 je vec zauzet — preskacem pokretanje backend-a.
) else (
    echo        http://127.0.0.1:8000
    start "PlanTim Backend" cmd /k "cd /d "%~dp0" && "%PHP_PATH%" artisan serve --host=127.0.0.1 --port=8000"
    timeout /t 5 /nobreak >nul
)

echo.
echo [KORAK 4] Frontend (Vite HTTPS)...
netstat -an | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo Port 5173 je vec zauzet — preskacem pokretanje frontenda.
) else (
    echo        https://!LOCAL_IP!:5173
    start "PlanTim Frontend" cmd /k "set PATH=%NODE_DIR%;%APPDATA%\npm;%PATH% && cd /d "%~dp0frontend" && if not exist node_modules\.bin\vite.cmd (echo GRESKA: Pokrenite INSTALL_FRONTEND_DEPS.bat && pause) else (call node_modules\.bin\vite.cmd --host 0.0.0.0)"
    timeout /t 8 /nobreak >nul
)

echo.
echo [KORAK 5] Provjera portova...
set "BACKEND_OK=0"
set "FRONTEND_OK=0"
netstat -an | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 set "BACKEND_OK=1"
netstat -an | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 set "FRONTEND_OK=1"

(
echo [%date% %time%] IP=!LOCAL_IP! backend=!BACKEND_OK! frontend=!FRONTEND_OK!
) >> "%LOG_FILE%"

echo.
echo ============================================================
if "!BACKEND_OK!"=="1" if "!FRONTEND_OK!"=="1" (
    echo   SERVERI POKRENUTI
) else (
    echo   UPOZORENJE: Provjerite prozore PlanTim Backend / Frontend
)
echo ============================================================
echo.
echo IP:         !LOCAL_IP!
echo Aplikacija: https://!LOCAL_IP!:5173/login
echo Backend:    http://127.0.0.1:8000  [!BACKEND_OK! = slusa]
echo Frontend:   https://!LOCAL_IP!:5173 [!FRONTEND_OK! = slusa]
echo.
if "!BACKEND_OK!"=="0" echo GRESKA: Backend ne slusa na portu 8000. Pogledajte prozor "PlanTim Backend".
if "!FRONTEND_OK!"=="0" echo GRESKA: Frontend ne slusa na portu 5173. Pogledajte prozor "PlanTim Frontend".
echo.
echo Kredencijali: admin@plantim.com / password
echo.
echo NAPOMENA: Browser moze prikazati upozorenje o certifikatu.
echo          Advanced -^> Accept the Risk and Continue
echo.
echo ============================================================
echo.

if "!FRONTEND_OK!"=="1" (
    timeout /t 2 /nobreak >nul
    start https://!LOCAL_IP!:5173/login
)

echo Pritisnite bilo koji taster za zatvaranje...
pause >nul
ENDLOCAL
