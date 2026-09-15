@echo off
REM Wrapper - uvijek drzi prozor otvorenim (i nakon greske)
cd /d "%~dp0"
title PlanTim - PULL (SAFE)
echo.
echo Pokrecem PULL_FROM_GITHUB.bat ...
echo.
call "%~dp0PULL_FROM_GITHUB.bat"
set "EC=%ERRORLEVEL%"
echo.
echo ========================================
if not "%EC%"=="0" (
    echo Zavrseno sa greskom ^(kod %EC%^).
) else (
    echo Zavrseno.
)
echo Prozor ostaje otvoren da vidite poruke.
echo ========================================
echo.
pause
