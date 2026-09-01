@echo off
setlocal EnableExtensions

REM Vraca httpd.conf prije PlanTim SSL izmjena

set "HTTPD_CONF=C:\xampp\apache\conf\httpd.conf"

if exist "%HTTPD_CONF%.plantim-backup" (
    copy /Y "%HTTPD_CONF%.plantim-backup" "%HTTPD_CONF%" >nul
    echo Vraceno iz httpd.conf.plantim-backup
    goto :done
)

if exist "%HTTPD_CONF%.plantim-fix-backup" (
    copy /Y "%HTTPD_CONF%.plantim-fix-backup" "%HTTPD_CONF%" >nul
    echo Vraceno iz httpd.conf.plantim-fix-backup
    goto :done
)

echo Nema backup fajla. Rucno u httpd.conf:
echo - odkomentirajte: Include conf/extra/httpd-ssl.conf
echo - uklonite: Include conf/extra/plantim-https-ip.conf

:done
echo Pokrenite Apache u XAMPP Control Panel.
pause
