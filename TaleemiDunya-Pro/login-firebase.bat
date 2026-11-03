@echo off
title Firebase Login - Taleemi Dunya Pro
set "PATH=E:\Andriod\nodejs;%PATH%"
echo ========================================================
echo   Firebase Login - Taleemi Dunya Pro
echo ========================================================
echo.
echo Browser window open hogi, apna Google/Firebase account select karein.
echo.
call npx firebase-tools login
echo.
pause
