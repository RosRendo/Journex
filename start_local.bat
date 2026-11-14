@echo off
title 🚀 Journex — LOCAL DEV STARTUP (Optimized)
color 0B

echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │   Journex — Local Optimized Startup (Docker + PM2)       │
echo  │   Frontend  -^> http://localhost:3000                      │
echo  │   Backend   -^> http://localhost:5000                      │
echo  │   MT5 Brdg  -^> http://localhost:5003                      │
echo  │   MT5 Sync  -^> http://localhost:5005                      │
echo  └──────────────────────────────────────────────────────────┘
echo.

set PROJECT_WIN=%~dp0
if "%PROJECT_WIN:~-1%"=="\" set PROJECT_WIN=%PROJECT_WIN:~0,-1%

REM ── [1/3] Start Docker Compose (Database, Backend, Frontend) ──────────
echo.
echo [1/3] Starting Database, Backend, and Frontend in Docker...
cd /d "%PROJECT_WIN%"
docker-compose -f docker-compose-full.yml up -d --build

REM ── [2/3] Start MT5 Python Bridge (PM2) ───────────────────────────────
echo.
echo [2/3] Starting MT5 Bridge with PM2...
call pm2 start ecosystem.config.js
call pm2 save

REM ── [3/3] Open Browser ────────────────────────────────────────────────
echo.
echo [3/3] Opening dashboard in browser...
timeout /t 3 /nobreak > nul
start chrome --start-fullscreen "http://localhost:3000/dashboard"

echo.
echo  ✅ All optimized services started in the background!
echo     To view logs, you can run:
echo     - Docker: docker-compose -f docker-compose-full.yml logs -f
echo     - PM2:    pm2 logs mt5-bridge-dev
echo.
timeout /t 3 > nul
