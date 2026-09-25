@echo off
title ExpenseFlow Pro Desktop Installer
color 0A
cls
echo =======================================================
echo          ExpenseFlow Pro Desktop Setup
echo =======================================================
echo.
echo Installing ExpenseFlow Pro App Shortcut on Desktop...
echo.

set SHORTCUT_PATH=%USERPROFILE%\Desktop\ExpenseFlow Pro.url
echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=http://localhost:5173 >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=%SystemRoot%\System32\shell32.dll >> "%SHORTCUT_PATH%"

echo.
echo =======================================================
echo  SUCCESS! ExpenseFlow Pro shortcut created on Desktop!
echo =======================================================
echo.
pause
