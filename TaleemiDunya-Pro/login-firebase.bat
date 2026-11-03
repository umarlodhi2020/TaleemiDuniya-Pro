@echo off
title Firebase Login - Taleemi Dunya Pro
set "PATH=E:\Andriod\nodejs;%PATH%"
cd /d "G:\TaleemiDunya-Pro-Main\TaleemiDunya-Pro"

echo ======================================================================
echo   Firebase Login - Taleemi Dunya Pro
echo ======================================================================
echo.
echo Browser window khulegi, apna Google/Firebase account select karein.
echo.

call "E:\Andriod\nodejs\npx.cmd" firebase-tools login

echo.
echo ======================================================================
echo   Login process complete! Ab aap "deploy-firebase.bat" chala sakte hain.
echo ======================================================================
echo.
pause
