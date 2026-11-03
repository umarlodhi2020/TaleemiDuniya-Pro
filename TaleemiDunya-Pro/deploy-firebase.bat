@echo off
title Deploy to Firebase Hosting - Taleemi Dunya Pro
set "PATH=E:\Andriod\nodejs;%PATH%"
cd /d "G:\TaleemiDunya-Pro-Main\TaleemiDunya-Pro"
echo ========================================================
echo   Deploying Taleemi Dunya Pro to Firebase Live Hosting
echo   Site: taleemidunya-pro-ed44e.web.app
echo ========================================================
echo.
call npx firebase-tools deploy --only hosting
echo.
echo ========================================================
echo   Deployment Complete!
echo ========================================================
pause
