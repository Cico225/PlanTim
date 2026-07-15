@echo off
SETLOCAL
chcp 65001 >nul 2>&1
title PlanTim - HTTPS Setup
color 0B

echo.
echo ============================================================
echo   PlanTim - HTTPS Setup za Lokalni Razvoj
echo ============================================================
echo.
echo Ova skripta ce konfigurisati HTTPS za https://localhost:5173
echo.

REM Provera da li je Node.js instaliran
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [GRESKA] Node.js nije instaliran ili nije u PATH-u!
    echo Molimo instalirajte Node.js pre pokretanja ove skripte.
    pause
    exit /b 1
)

echo [KORAK 1] Provera mkcert instalacije...
echo.

where mkcert >nul 2>&1
if %errorlevel% neq 0 (
    echo mkcert nije instaliran. Instaliram...
    echo.
    call npm install -g mkcert
    if %errorlevel% neq 0 (
        echo [GRESKA] Neuspesno instaliranje mkcert!
        echo Molimo pokrenite: npm install -g mkcert
        pause
        exit /b 1
    )
    echo.
) else (
    echo ✓ mkcert je vec instaliran
    echo.
)

echo [KORAK 2] Instalacija lokalnog CA (Certificate Authority)...
echo.
mkcert -install
if %errorlevel% neq 0 (
    echo [UPOZORENJE] Neuspesno instaliranje CA. Pokušavamo nastaviti...
    echo.
)

echo.
echo [KORAK 3] Kreiranje certs direktorijuma...
echo.

cd /d "%~dp0\frontend"

if not exist "certs" (
    mkdir certs
    echo ✓ Direktorijum certs kreiran
) else (
    echo ✓ Direktorijum certs vec postoji
)

echo.
echo [KORAK 4] Generisanje SSL sertifikata...
echo.

if exist "certs\localhost-key.pem" (
    echo Sertifikati vec postoje. Preskacem generisanje...
    echo Ako zelite da regenerisete, obrisite certs folder i pokrenite skriptu ponovo.
) else (
    mkcert create-ca
    mkcert create-cert --key certs/localhost-key.pem --cert certs/localhost-cert.pem --domain localhost --domain 127.0.0.1 --domain ::1
    if %errorlevel% neq 0 (
        echo [GRESKA] Neuspesno generisanje sertifikata!
        pause
        exit /b 1
    )
    echo ✓ SSL sertifikati generisani!
)

echo.
echo [KORAK 5] Provera vite.config.ts...
echo.

cd /d "%~dp0"

REM Provera da li vite.config.ts vec ima HTTPS konfiguraciju
findstr /C:"https:" frontend\vite.config.ts >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] vite.config.ts vec ima HTTPS konfiguraciju.
    echo Ako zelite da je azurirate, molimo proverite fajl ručno.
) else (
    echo [INFO] Potrebno je ručno dodati HTTPS konfiguraciju u vite.config.ts
    echo.
    echo Dodajte sledece u server sekciju:
    echo.
    echo   https: {
    echo     key: fs.readFileSync('./certs/localhost-key.pem'),
    echo     cert: fs.readFileSync('./certs/localhost-cert.pem'),
    echo   },
    echo.
    echo I dodajte na vrh fajla:
    echo   import fs from 'fs';
    echo.
)

echo.
echo ============================================================
echo   HTTPS SETUP ZAVRSEN!
echo ============================================================
echo.
echo Sertifikati su kreirani u: frontend\certs\
echo.
echo Sledeci koraci:
echo 1. Ažurirajte frontend/vite.config.ts sa HTTPS konfiguracijom
echo 2. Restartujte frontend server
echo 3. Otvorite https://localhost:5173 u browser-u
echo.
echo [UPOZORENJE] Browser moze prikazati upozorenje o sertifikatu.
echo To je normalno za lokalne sertifikate - kliknite "Advanced" i
echo "Proceed to localhost (unsafe)" da nastavite.
echo.
pause

ENDLOCAL

