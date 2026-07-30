@echo off
title 🛑 Stop Journex Services
color 0C

echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │   Journex — Stop Background Services                     │
echo  └──────────────────────────────────────────────────────────┘
echo.

set PROJECT_WIN=d:\FOR RENDO (ONLY )\Personal Project\Dashboard
cd /d "%PROJECT_WIN%"

echo [1/3] Stopping Docker Containers...
docker-compose -f docker-compose-full.yml down

echo.
echo [2/3] Stopping PM2 Services (MT5 Bridge)...
call pm2 stop all

echo.
echo [3/3] Stopping Clap Listener Background Task (Optional)...
powershell -Command "Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object {$_.Path -match '3.12.0'} | Stop-Process -Force"

echo.
echo  ✅ All background services stopped! Your CPU can rest now.
echo.
timeout /t 3 > nul
