@echo off
title 🌐 Journex — PRODUCTION (Cloudflare Tunnels)
color 0B

REM ═══════════════════════════════════════════════════════════════════════
REM  PRODUCTION STARTUP — CLOUDFLARE TUNNEL EDITION
REM
REM  Permanent fixed URLs (no updates needed each run):
REM    Frontend  → https://dashboard-roan-tau-xrg43s0811.vercel.app
REM    Backend   → https://api.journex.online → localhost:5000
REM    MT5 Brdg  → https://python.journex.online → localhost:5003
REM
REM  What this script starts:
REM    [1] Backend Express API    (port 5000)
REM    [2] MT5 Python bridge      (port 5003)
REM    [3] Cloudflare tunnel      (config.yml — routes both domains)
REM    [4] Opens live dashboard
REM ═══════════════════════════════════════════════════════════════════════

set PROJECT_WIN=d:\Forex\journex
set BACKEND_DIR=%PROJECT_WIN%\backend
set DASHBOARD_URL=https://dashboard-roan-tau-xrg43s0811.vercel.app/dashboard

echo.
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║   Journex — Production Startup (Cloudflare Edition)     ║
echo  ║                                                                  ║
echo  ║   Frontend  → https://dashboard-roan-tau-xrg43s0811.vercel.app  ║
echo  ║   Backend   → https://api.journex.online  (:5000 local) ║
echo  ║   MT5 Brdg  → https://python.journex.online (:5003 loc) ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.

REM ── [1/4] Start Backend Express API (port 5000) ────────────────────────
echo [1/4] Starting Backend API on port 5000...
start "Backend API :5000" cmd /k "cd /d %BACKEND_DIR% && npm run dev"
echo       Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

REM ── [2/4] Start MT5 Python Bridge (port 5003) ─────────────────────────
echo [2/4] Starting MT5 Bridge on port 5003...
start "MT5 Bridge :5003" cmd /k "cd /d %PROJECT_WIN% && python mt5_bridge.py"
echo       Waiting for MT5 bridge to initialize...
timeout /t 4 /nobreak > nul

REM ── [3/4] Start Cloudflare Tunnel (config.yml) ────────────────────────
echo [3/4] Starting Cloudflare tunnel...
echo       api.journex.online    → localhost:5000
echo       python.journex.online → localhost:5003

REM Try running via config.yml (named tunnel, uses stored credentials)
where cloudflared >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "Cloudflare Tunnel" cmd /k "cd /d %PROJECT_WIN% && cloudflared tunnel --config config.yml run"
    echo       [OK] Cloudflare tunnel launched via config.yml
) else (
    REM cloudflared not on PATH — try common install locations
    if exist "C:\Program Files\cloudflared\cloudflared.exe" (
        start "Cloudflare Tunnel" cmd /k "cd /d %PROJECT_WIN% && \"C:\Program Files\cloudflared\cloudflared.exe\" tunnel --config config.yml run"
        echo       [OK] Cloudflare tunnel launched from Program Files
    ) else (
        REM Last resort: use the token directly
        start "Cloudflare Tunnel" cmd /k "cloudflared tunnel run --token eyJhIjoiNjgyYTI2OGM1YjBlNThhMjRjMTU0Y2I2MjU1ODVlN2MiLCJ0IjoiZDg4NTUzZmItZDVlMy00OTZhLWIyNWUtOGY4ODI1NTcwYTIzIiwicyI6Ik56UXlPV0pqTnpJdE5HSmtNQzAwWW1GbExUbGtPREV0WVRObFpqZGxZVEpqTjJabSJ9"
        echo       [WARN] cloudflared not found on PATH — running with token
    )
)

echo       Waiting for tunnel to connect...
timeout /t 6 /nobreak > nul

REM ── [4/4] Open the live dashboard ─────────────────────────────────────
echo.
echo [4/4] Opening production dashboard...
start %DASHBOARD_URL%

echo.
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║  ✅  Production startup complete!                                ║
echo  ║                                                                  ║
echo  ║  🖥️   Backend API  :5000  → api.journex.online           ║
echo  ║  📡  MT5 Bridge  :5003  → python.journex.online         ║
echo  ║  ☁️   Cloudflare          → both tunnels active                  ║
echo  ║  🌐  Dashboard            → Vercel (always live)                 ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.
echo  3 windows opened: Backend, MT5 Bridge, Cloudflare Tunnel
echo  Keep them running. Close any one to stop that service.
echo.
pause

