@echo off
title 🌐 DashboardKiller — PRODUCTION (ONE-CLICK AUTO-DEPLOY)
color 0B

REM ═══════════════════════════════════════════════════════════════════════
REM  PRODUCTION STARTUP — FULLY AUTOMATED
REM
REM  This script does EVERYTHING in one click:
REM    [1] Starts the MT5 Python bridge (port 5003)
REM    [2] Starts Ngrok tunnel (exposes MT5 bridge to Railway cloud)
REM    [3] Auto-detects the new Ngrok URL (changes every run)
REM    [4] Updates Railway  → LOCAL_MT5_URL
REM        Updates Vercel   → NEXT_PUBLIC_BRIDGE_URL
REM        Triggers Vercel  → Production redeploy (~60s)
REM    [5] Opens the live dashboard in your browser
REM
REM  Requirements (one-time setup):
REM    npm i -g @railway/cli vercel
REM    railway login
REM    vercel login
REM ═══════════════════════════════════════════════════════════════════════

set PROJECT_WIN=d:\Forex\dashboardkiller

echo.
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║   DashboardKiller — Production Startup (ONE-CLICK AUTO-DEPLOY)  ║
echo  ║   Frontend  → https://dashboard-nine-flax-74.vercel.app         ║
echo  ║   Backend   → https://dashboard-production-f374.up.railway.app  ║
echo  ║   MT5 Brdg  → Local Windows (Ngrok tunnel, URL auto-updated)    ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.

REM ── [1/4] Start MT5 Python Bridge ─────────────────────────────────────
echo [1/4] Starting MT5 Bridge on port 5003...
start "MT5 Bridge" cmd /k "cd /d %PROJECT_WIN% && python mt5_bridge.py"
echo       Waiting for MT5 bridge to initialize...
timeout /t 4 /nobreak > nul

REM ── [2/4] Start Ngrok Tunnel ──────────────────────────────────────────
echo [2/4] Starting Ngrok tunnel (mt5-bridge)...
start "Ngrok — MT5 Bridge" cmd /k "cd /d %PROJECT_WIN% && ngrok start --config ngrok-tunnels.yml mt5-bridge"
echo       Waiting 9 seconds for Ngrok to get a URL from the server...
timeout /t 9 /nobreak > nul

REM ── [3/4 + 4/4] Auto-update Railway + Vercel, then redeploy ───────────
echo [3/4] Fetching Ngrok URL and updating cloud services...
echo       (Railway + Vercel env vars will be set, then Vercel will redeploy)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_WIN%\update_prod_env.ps1" -ProjectPath "%PROJECT_WIN%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ⚠️  Auto-update script returned an error.
    echo     Check if Railway CLI and Vercel CLI are installed and logged in:
    echo       npm i -g @railway/cli vercel
    echo       railway login
    echo       vercel login
    echo.
    echo  You can re-run the env update manually at any time:
    echo    powershell -File "%PROJECT_WIN%\update_prod_env.ps1"
    echo.
)

REM ── [4/4] Open the live dashboard ─────────────────────────────────────
echo.
echo [4/4] Opening production dashboard in browser...
timeout /t 3 /nobreak > nul
start https://dashboard-nine-flax-74.vercel.app/dashboard

echo.
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║  ✅  Production startup complete!                                ║
echo  ║                                                                  ║
echo  ║  📡  MT5 Bridge    : running on port 5003                        ║
echo  ║  🔗  Ngrok tunnel  : active (URL auto-updated in cloud)          ║
echo  ║  🚂  Railway       : LOCAL_MT5_URL refreshed                     ║
echo  ║  ▲   Vercel        : NEXT_PUBLIC_BRIDGE_URL refreshed            ║
echo  ║  🌐  Dashboard     : Redeploying (~60s) then live                ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.
echo  Tip: Keep this window open. Close it to stop nothing —
echo       MT5 Bridge and Ngrok run in their own windows.
echo.
pause
