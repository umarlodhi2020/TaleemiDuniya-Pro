@echo off
title Deploy to Firebase Live Hosting - Taleemi Dunya Pro
set "PATH=E:\Andriod\nodejs;%PATH%"
cd /d "G:\TaleemiDunya-Pro-Main\TaleemiDunya-Pro"

echo ======================================================================
echo   Deploying Taleemi Dunya Pro to Firebase Live Hosting
echo   Target Site: taleemidunya-pro-ed44e.web.app
echo ======================================================================
echo.

call "E:\Andriod\nodejs\npx.cmd" firebase-tools deploy --only hosting

if %errorlevel% neq 0 (
    echo.
    echo [NOTE] Agar login error aaye toh pehle "login-firebase.bat" par double-click karein!
    echo.
) else (
    echo.
    echo ======================================================================
    echo   [MUBARAK HO] Successfully Deployed to Firebase Live Hosting!
    echo   Check live website: https://taleemidunya-pro-ed44e.web.app
    echo ======================================================================
    echo.
)

pause
