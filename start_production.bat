@echo off
title 🌐 DashboardKiller — PRODUCTION ACCESS
color 0B

REM ═══════════════════════════════════════════════════════════════════════
REM  PRODUCTION ACCESS SCRIPT
REM  Your friend accesses the Vercel dashboard:
REM    https://dashboard-nine-flax-74.vercel.app
REM
REM  This script starts the LOCAL components that Vercel talks to:
REM    • MT5 Bridge   → runs locally on Windows (your broker data)
REM    • Ngrok tunnel → exposes the MT5 bridge so Railway backend
REM                     can reach it from the cloud
REM
REM  The Express backend + PostgreSQL database run on Railway (cloud).
REM  You do NOT need to run Docker locally for production mode.
REM ═══════════════════════════════════════════════════════════════════════

set PROJECT_WIN=d:\Forex\dashboardkiller

echo.
echo  ┌──────────────────────────────────────────────────────────────┐
echo  │   DashboardKiller — Production Startup                       │
echo  │   Frontend  → https://dashboard-nine-flax-74.vercel.app      │
echo  │   Backend   → https://dashboard-production-f374.up.railway.app│
echo  │   MT5 Brdg  → Local Windows (tunnelled via Ngrok)            │
echo  └──────────────────────────────────────────────────────────────┘
echo.

REM ── [1/2] Start MT5 Python Bridge on Windows ──────────────────────────
echo [1/2] Starting MT5 Bridge (Python)...
start "MT5 Bridge" cmd /k "cd /d %PROJECT_WIN% && python mt5_bridge.py"
timeout /t 3 /nobreak > nul

REM ── [2/2] Start Ngrok to expose MT5 Bridge to Railway backend ─────────
echo [2/2] Starting Ngrok tunnels (MT5 bridge → cloud)...
start "Ngrok Tunnels" cmd /k "cd /d %PROJECT_WIN% && ngrok start --config ngrok-tunnels.yml mt5-bridge"
timeout /t 4 /nobreak > nul

REM ── Open the production Vercel dashboard ──────────────────────────────
echo.
echo  Opening Vercel production dashboard...
start https://dashboard-nine-flax-74.vercel.app/dashboard

echo.
echo  ✅ Production access ready!
echo.
echo  ┌───────────────────────────────────────────────────────────────┐
echo  │  IMPORTANT: After Ngrok starts, copy the HTTPS tunnel URL     │
echo  │  and update this Railway env variable:                        │
echo  │    LOCAL_MT5_URL = https://xxxx.ngrok-free.app               │
echo  │  Then redeploy Railway (takes ~30 seconds).                   │
echo  └───────────────────────────────────────────────────────────────┘
echo.
pause
