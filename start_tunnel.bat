@echo off
title ExpenseFlow Pro - Public Internet Tunnel
echo ==========================================================
echo Starting Cloudflare Secure Tunnel for ExpenseFlow Pro...
echo ==========================================================
echo.
echo Make sure Backend (python run.py) and Frontend (npm run dev) are running!
echo.
echo Creating your public HTTPS link...
echo.
"%~dp0cloudflared.exe" tunnel --url http://localhost:5173
pause
