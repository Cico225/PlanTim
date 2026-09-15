@echo off
REM Wrapper - drzi CMD otvorenim da vidite greske
cd /d "%~dp0"
cmd /k "PULL_FROM_GITHUB.bat"
