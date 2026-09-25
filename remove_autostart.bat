@echo off
title ExpenseFlow Pro - Disable PC AutoStart
echo ===================================================
echo     ExpenseFlow Pro - Disabling AutoStart on Boot
echo ===================================================
echo.

powershell -Command "
$startupFolder = [Environment]::GetFolderPath('Startup')
$startupLnk = Join-Path $startupFolder 'ExpenseFlow_AutoStart.lnk'
if (Test-Path $startupLnk) {
    Remove-Item $startupLnk -Force
    Write-Host 'Removed ExpenseFlow from Windows Startup folder.'
} else {
    Write-Host 'ExpenseFlow was not set to autostart.'
}
"

echo.
echo ===================================================
echo Done! It will no longer start automatically on boot.
echo ===================================================
echo.
pause
