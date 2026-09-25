@echo off
title ExpenseFlow Pro - Stopping All Services...
echo ===================================================
echo       Stopping ExpenseFlow Pro Services...
echo ===================================================

echo [1/3] Stopping Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1

echo [2/3] Freeing port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [3/3] Freeing port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo All ExpenseFlow Pro services have been stopped.
timeout /t 3
