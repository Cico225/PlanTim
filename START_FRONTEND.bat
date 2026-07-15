@echo off
SETLOCAL

echo ============================================
echo PlanTim Frontend Server
echo ============================================
echo.

REM Check if npm is available
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm nije pronadjen!
    echo.
    echo Molimo instalirajte Node.js sa: https://nodejs.org/
    echo.
    pause
    EXIT /B 1
)

cd /d "%~dp0\frontend"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Node modules nisu instalirani. Instaliramo...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Greška pri instalaciji npm paketa!
        pause
        EXIT /B 1
    )
    echo.
)

echo ✓ Pokrećem React frontend server...
echo.
echo Frontend URL: http://localhost:5173
echo.
echo Pritisnite Ctrl+C da zaustavite server.
echo ============================================
echo.

npm run dev

ENDLOCAL

