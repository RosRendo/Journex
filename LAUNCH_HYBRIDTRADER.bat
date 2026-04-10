@echo off
setlocal EnableDelayedExpansion
title 🚀 Trading Dashboard Launcher
color 0A

:: ============================================================
::  CONFIGURATION — Edit these to match your machine
:: ============================================================
set PROJECT_DIR=D:\Forex\dashboardkiller
set PYTHON_CMD=python
set MT5_PORT=5003
set BACKEND_PORT=5000
set VERCEL_PROJECT_DIR=D:\Forex\dashboardkiller
set VERCEL_DASHBOARD=https://dashboard-nine-flax-74.vercel.app
set TV_CHART_URL=https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%%3AXAUUSD
:: ============================================================

echo.
echo  =====================================================
echo   TRADING DASHBOARD LAUNCHER v2.0
echo  =====================================================
echo.

:: ----------------------------------------------------------
:: STEP 1: Open TradingView Desktop App (left, snapped)
:: ----------------------------------------------------------
echo [1/9] Launching TradingView app (left side)...

powershell -Command ^
  "$tvShortcut = 'C:\Users\Ros Rendo\OneDrive\Desktop\TradingView.lnk'; " ^
  "if (Test-Path $tvShortcut) { Start-Process $tvShortcut; Start-Sleep -Seconds 4 } " ^
  "else { Start-Process 'shell:AppsFolder\TradingView.TradingView_4ndqd4k6378q0!App' -ErrorAction SilentlyContinue; Start-Sleep -Seconds 4 } " ^
  "$proc = Get-Process | Where-Object {$_.MainWindowTitle -like '*TradingView*'} | Select-Object -First 1; " ^
  "if (-not $proc) { " ^
    "Write-Host '   [WARN] App missing. Launching Firefox fallback...'; " ^
    "Start-Process 'firefox.exe' '--new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%%3AXAUUSD'; " ^
  "} "
powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $sw=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width;$sh=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height; .\Arrange-Windows.ps1 -targetClass 'TradingView' -targetTitle 'TradingView' -leftX 0 -topY 0 -width ($sw/2) -height $sh"
echo    Done.

:: ----------------------------------------------------------
:: STEP 2: Open Firefox with TradingView chart (right, snapped)
:: ----------------------------------------------------------
echo [2/9] Opening Firefox with chart URL (right side)...
start "" "firefox.exe" "%TV_CHART_URL%"
timeout /t 3 /nobreak >nul
powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $sw=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width;$sh=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height; .\Arrange-Windows.ps1 -targetClass 'firefox' -targetTitle 'Firefox' -leftX ($sw/2) -topY 0 -width ($sw/2) -height $sh"
echo    Done.

:: ----------------------------------------------------------
:: STEP 3: Start Docker Backend + Database
:: ----------------------------------------------------------
echo [3/9] Starting Docker Backend (port %BACKEND_PORT%) + PostgreSQL...
cd /d "%PROJECT_DIR%"
docker-compose up -d
if errorlevel 1 (
    echo    [WARN] Docker failed. Is Docker Desktop running?
    echo    Please open Docker Desktop and press any key to retry...
    pause
    docker-compose up -d
)
echo    Docker containers started.
timeout /t 5 /nobreak >nul

:: Wait for backend to be healthy
echo    Waiting for backend to be ready...
for /L %%i in (1,1,10) do (
    powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:5000/health' -TimeoutSec 3 -ErrorAction Stop; Write-Host '   [OK] Backend healthy: ' + $r.status } catch { Write-Host '   ... waiting...' }"
    timeout /t 2 /nobreak >nul
)

:: ----------------------------------------------------------
:: STEP 4: Start MT5 Bridge (Python, port 5003)
:: ----------------------------------------------------------
echo [4/9] Starting MT5 Bridge (port %MT5_PORT%)...
if not exist "%PROJECT_DIR%" (
    echo    ERROR: Project folder not found: %PROJECT_DIR%
    pause
    exit /b 1
)
start "MT5 Bridge" cmd /k "cd /d "%PROJECT_DIR%" && %PYTHON_CMD% mt5_bridge.py"
echo    Started in new window.
timeout /t 4 /nobreak >nul

:: ----------------------------------------------------------
:: STEP 5 & 6: Start ONE ngrok agent for BOTH tunnels
:: ----------------------------------------------------------
set NGROK_CFG=%PROJECT_DIR%\ngrok-tunnels.yml
start "ngrok-All" cmd /k "ngrok start --all --config=%NGROK_CFG% --log=stdout"
echo    Waiting for ngrok tunnels to initialize...
timeout /t 6 /nobreak >nul

:: Extract URLs from ngrok API (port 4040)
set BRIDGE_URL=
set API_URL=

for /L %%i in (1,1,15) do (
    if "!BRIDGE_URL!"=="" (
        timeout /t 2 /nobreak >nul
        for /f "usebackq tokens=*" %%A in (`powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:4040/api/tunnels' -ErrorAction Stop; $t = $r.tunnels | Where-Object { $_.name -eq 'mt5-bridge' -and $_.proto -eq 'https' } | Select-Object -First 1; if ($t) { $t.public_url } } catch {}"`) do (
            set "BRIDGE_URL=%%A"
        )
    )
    if "!API_URL!"=="" (
        for /f "usebackq tokens=*" %%A in (`powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:4040/api/tunnels' -ErrorAction Stop; $t = $r.tunnels | Where-Object { $_.name -eq 'backend-api' -and $_.proto -eq 'https' } | Select-Object -First 1; if ($t) { $t.public_url } } catch {}"`) do (
            set "API_URL=%%A"
        )
    )
)

if "%BRIDGE_URL%"=="" (
    echo    [ERROR] Could not auto-detect MT5 ngrok URL.
    set /p BRIDGE_URL=   Paste MT5 ngrok HTTPS URL manually: 
)
if "%API_URL%"=="" (
    echo    [ERROR] Could not auto-detect Backend ngrok URL.
    set /p API_URL=   Paste Backend ngrok HTTPS URL manually: 
)

echo    [OK] MT5 Bridge URL: %BRIDGE_URL%
echo    [OK] Backend API URL: %API_URL%

:: ----------------------------------------------------------
:: STEP 7: Update BOTH Vercel environment variables
:: ----------------------------------------------------------
echo [7/9] Updating Vercel environment variables...
cd /d "%VERCEL_PROJECT_DIR%"

:: Update NEXT_PUBLIC_BRIDGE_URL (MT5 port 5003)
echo    Setting NEXT_PUBLIC_BRIDGE_URL = %BRIDGE_URL%
call vercel env rm NEXT_PUBLIC_BRIDGE_URL production --yes 2>nul
set TMPFILE1=%TEMP%\bridge_url_tmp.txt
echo %BRIDGE_URL%> "%TMPFILE1%"
call vercel env add NEXT_PUBLIC_BRIDGE_URL production < "%TMPFILE1%"
del "%TMPFILE1%" 2>nul

:: Update NEXT_PUBLIC_API_URL (Backend port 5000)
echo    Setting NEXT_PUBLIC_API_URL = %API_URL%
call vercel env rm NEXT_PUBLIC_API_URL production --yes 2>nul
set TMPFILE2=%TEMP%\api_url_tmp.txt
echo %API_URL%> "%TMPFILE2%"
call vercel env add NEXT_PUBLIC_API_URL production < "%TMPFILE2%"
del "%TMPFILE2%" 2>nul

echo    Both env vars updated.

:: ----------------------------------------------------------
:: STEP 8: Deploy to Vercel Production
:: ----------------------------------------------------------
echo [8/9] Deploying to Vercel production...
call vercel --prod --yes
echo    Vercel deploy triggered.

:: ----------------------------------------------------------
:: STEP 9: Open the live dashboard
:: ----------------------------------------------------------
echo [9/9] Opening dashboard: %VERCEL_DASHBOARD%...
timeout /t 10 /nobreak >nul
start "" "chrome.exe" "%VERCEL_DASHBOARD%"
start "" "firefox.exe" "%VERCEL_DASHBOARD%"

:: ----------------------------------------------------------
:: Done!
:: ----------------------------------------------------------
echo.
echo  =====================================================
echo   ALL DONE! Your trading setup is LIVE.
echo.
echo   MT5 Bridge:  %BRIDGE_URL%
echo   Backend API: %API_URL%
echo   Dashboard:   %VERCEL_DASHBOARD%
echo  =====================================================
echo.
echo   URLs copied: MT5=%BRIDGE_URL%
echo %BRIDGE_URL% | clip
pause