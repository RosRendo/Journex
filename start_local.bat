@echo off
title 🚀 Journex — LOCAL DEV STARTUP
color 0A

REM ═══════════════════════════════════════════════════════════════════════
REM  LOCAL DEV STARTUP SCRIPT
REM  Opens: Local Frontend (localhost:3000) + Local Backend + MT5 Bridge
REM
REM  ▶ SETUP (one-time):
REM    1. Copy this file to your Windows Desktop or any convenient folder
REM    2. Adjust the paths at the top of this file if your project is
REM       in a different location.
REM    3. Double-click to run — or press Win+R, type shell:startup,
REM       and put a shortcut here to auto-run on every boot.
REM ═══════════════════════════════════════════════════════════════════════

REM ── PATHS (edit these if your project lives elsewhere) ─────────────────
set PROJECT_WIN=d:\Forex\journex
set FRONTEND_DIR=%PROJECT_WIN%\frontend
set PROJECT_WSL=/mnt/d/Forex/journex
REM If you moved the project into WSL native fs, change the line above:
REM set PROJECT_WSL=/home/%USERNAME%/journex
REM ───────────────────────────────────────────────────────────────────────

echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │   Journex — Local Development Startup            │
echo  │   Frontend  → http://localhost:3000                      │
echo  │   Backend   → http://localhost:5000                      │
echo  │   MT5 Brdg  → http://localhost:5003                      │
echo  └──────────────────────────────────────────────────────────┘
echo.

REM ── [1/3] Start Express Backend ───────────────────────────────────────
echo [1/3] Starting Express Backend (npm run dev)...
start "Backend (Express)" cmd /k "cd /d %PROJECT_WIN%\backend && npm run dev"

REM Wait 3 seconds for backend server to start
echo       Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

REM ── [2/3] Start MT5 Python Bridge on Windows ──────────────────────────
echo [2/3] Starting MT5 Bridge (Python)...
start "MT5 Bridge" cmd /k "cd /d %PROJECT_WIN% && python mt5_bridge.py"

REM Wait 3 seconds for bridge to come up
timeout /t 3 /nobreak > nul

REM ── [3/3] Start Next.js Frontend (local dev server) ───────────────────
echo [3/3] Starting Next.js frontend (localhost:3000)...
start "Frontend (Next.js)" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

REM Wait 5 seconds for Next.js to compile, then open the browser
echo       Waiting 5 seconds for Next.js to compile...
timeout /t 5 /nobreak > nul

echo.
echo  Opening dashboard in browser...
start http://localhost:3000/dashboard

echo.
echo  ✅ All services started!
echo     Close any of the opened terminal windows to stop that service.
echo.
pause
