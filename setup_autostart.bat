@echo off
title ExpenseFlow Pro - Enable PC AutoStart
echo ===================================================
echo     ExpenseFlow Pro - Enabling AutoStart on Boot
echo ===================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcuts.ps1"

echo.
echo ===================================================
echo DONE! ExpenseFlow Pro will now start automatically
echo whenever your PC turns on and will open in browser.
echo ===================================================
echo.
pause
