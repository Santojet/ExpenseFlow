@echo off
title ExpenseFlow Pro - Starting All Services...
echo ===================================================
echo       ExpenseFlow Pro - Automated Launcher
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend Server (Flask)...
start /min "ExpenseFlow-Backend" cmd /c "cd /d "%~dp0backend" && python run.py"

echo [2/3] Starting Frontend Server (Vite)...
start /min "ExpenseFlow-Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Starting Cloudflare Tunnel (Internet & Mobile Access)...
start /min "ExpenseFlow-CFTunnel" cmd /c ""%~dp0cloudflared.exe" tunnel --url http://localhost:5173"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening ExpenseFlow Pro in your browser...
start http://localhost:5173

echo.
echo ===================================================
echo   ExpenseFlow Pro is now RUNNING!
echo.
echo   * Local PC:    http://localhost:5173
echo   * Mobile URL:  https://largely-fact-itself-pepper.trycloudflare.com
echo ===================================================
timeout /t 5
