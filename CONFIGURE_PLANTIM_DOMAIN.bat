@echo off
SETLOCAL
chcp 65001 >nul 2>&1
title PlanTim - Konfiguracija Plantim Domena
color 0B

echo.
echo ============================================================
echo   PlanTim - Konfiguracija Plantim Domena
echo ============================================================
echo.
echo Ova skripta ce konfigurisati aplikaciju da koristi
echo http://plantim:5173 umesto http://localhost:5173
echo.
echo VAZNO: Potrebno je dodati unos u hosts fajl ručno!
echo.
pause

echo.
echo [KORAK 1] Ažuriranje frontend/vite.config.ts...
echo.

REM Ažuriranje vite.config.ts - nije potrebno menjati, host: true radi za sve domene

echo [KORAK 2] Ažuriranje frontend/.env fajla...
echo.

cd /d "%~dp0\frontend"

if not exist ".env" (
    if exist "env-template.txt" (
        copy env-template.txt .env >nul
    )
)

REM Ažuriranje VITE_API_URL i VITE_APP_URL
powershell -Command "(Get-Content .env) -replace 'VITE_API_URL=http://localhost:8000/api', 'VITE_API_URL=http://plantim:8000/api' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'VITE_APP_URL=http://localhost:5173', 'VITE_APP_URL=http://plantim:5173' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'VITE_WS_URL=ws://localhost:6001', 'VITE_WS_URL=ws://plantim:6001' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'VITE_OFFICE365_REDIRECT_URI=http://localhost:5173', 'VITE_OFFICE365_REDIRECT_URI=http://plantim:5173' | Set-Content .env"

REM Dodavanje VITE_API_BACKEND_URL ako ne postoji
powershell -Command "$content = Get-Content .env; if ($content -notmatch 'VITE_API_BACKEND_URL=') { $content += 'VITE_API_BACKEND_URL=http://plantim:8000' } else { $content = $content -replace 'VITE_API_BACKEND_URL=.*', 'VITE_API_BACKEND_URL=http://plantim:8000' }; $content | Set-Content .env"

echo ✓ Frontend .env ažuriran!
echo.

cd /d "%~dp0"

echo [KORAK 3] Ažuriranje backend/.env fajla...
echo.

if not exist ".env" (
    echo [GRESKA] Backend .env fajl ne postoji!
    echo Molimo pokrenite SETUP_AUTO.bat prvo.
    pause
    exit /b 1
)

REM Ažuriranje APP_URL
powershell -Command "(Get-Content .env) -replace 'APP_URL=http://localhost:8000', 'APP_URL=http://plantim:8000' | Set-Content .env"

REM Ažuriranje SANCTUM_STATEFUL_DOMAINS
powershell -Command "$content = Get-Content .env; $content = $content -replace 'SANCTUM_STATEFUL_DOMAINS=.*', 'SANCTUM_STATEFUL_DOMAINS=plantim,plantim:5173,plantim:8000,localhost,localhost:5173,127.0.0.1,127.0.0.1:5173'; $content | Set-Content .env"

REM Ažuriranje FRONTEND_URL
powershell -Command "$content = Get-Content .env; $content = $content -replace 'FRONTEND_URL=http://localhost:5173', 'FRONTEND_URL=http://plantim:5173'; if ($content -notmatch 'FRONTEND_URL=') { $content += 'FRONTEND_URL=http://plantim:5173' }; $content | Set-Content .env"

REM Ažuriranje SESSION_DOMAIN ako postoji
powershell -Command "$content = Get-Content .env; if ($content -match 'SESSION_DOMAIN=') { $content = $content -replace 'SESSION_DOMAIN=.*', 'SESSION_DOMAIN=plantim' } else { $content += 'SESSION_DOMAIN=plantim' }; $content | Set-Content .env"

echo ✓ Backend .env ažuriran!
echo.

echo [KORAK 4] Kreiranje hosts fajl uputstva...
echo.

(
echo ============================================================
echo   RUČNI KORAK: Dodavanje Plantim u Hosts Fajl
echo ============================================================
echo.
echo 1. Otvorite Notepad kao Administrator:
echo    - Desni klik na Notepad
echo    - Izaberite "Run as administrator"
echo.
echo 2. U Notepad-u, otvorite fajl:
echo    C:\Windows\System32\drivers\etc\hosts
echo.
echo 3. Na kraju fajla, dodajte sledecu liniju:
echo    127.0.0.1    plantim
echo.
echo 4. Sačuvajte fajl (Ctrl+S)
echo.
echo 5. Restartujte browser da primeni promene
echo.
echo ============================================================
echo   Nakon ove konfiguracije, aplikacija ce biti dostupna na:
echo   - Frontend: http://plantim:5173
echo   - Backend:  http://plantim:8000
echo ============================================================
) > HOSTS_SETUP_INSTRUCTIONS.txt

echo ✓ Uputstvo kreirano u HOSTS_SETUP_INSTRUCTIONS.txt
echo.

echo ============================================================
echo   KONFIGURACIJA ZAVRSENA!
echo ============================================================
echo.
echo Sledeci korak:
echo 1. Dodajte "127.0.0.1    plantim" u hosts fajl (vidi HOSTS_SETUP_INSTRUCTIONS.txt)
echo 2. Restartujte servere (pokrenite START_ALL_AUTO_NETWORK.bat ponovo)
echo 3. Otvorite http://plantim:5173 u browser-u
echo.
pause

ENDLOCAL

