@echo off
setlocal EnableDelayedExpansion
title 🚀 Trading Dashboard Launcher
color 0A

:: ============================================================
::  CONFIGURATION — Edit these to match your machine
:: ============================================================
set PROJECT_DIR=D:\Forex\dashboardkiller
set PYTHON_CMD=python
set NGROK_PORT=5003
set VERCEL_PROJECT_DIR=D:\Forex\dashboardkiller
set VERCEL_ENV_KEY=NEXT_PUBLIC_BRIDGE_URL
set VERCEL_DASHBOARD=https://dashboard-nine-flax-74.vercel.app
set TV_CHART_URL=https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%%3AXAUUSD
:: ============================================================

echo.
echo  =====================================================
echo   TRADING DASHBOARD LAUNCHER
echo  =====================================================
echo.

:: ----------------------------------------------------------
:: STEP 1: Open TradingView Desktop App (left, snapped)
:: ----------------------------------------------------------
echo [1/7] Launching TradingView app (left side)...

:: Handle Custom Shortcut
powershell -Command ^
  "$tvShortcut = 'C:\Users\Ros Rendo\OneDrive\Desktop\TradingView.lnk'; " ^
  "if (Test-Path $tvShortcut) { Start-Process $tvShortcut; Start-Sleep -Seconds 4 } " ^
  "else { Start-Process 'shell:AppsFolder\TradingView.TradingView_4ndqd4k6378q0!App' -ErrorAction SilentlyContinue; Start-Sleep -Seconds 4 } " ^
  "$proc = Get-Process | Where-Object {$_.MainWindowTitle -like '*TradingView*'} | Select-Object -First 1; " ^
  "if (-not $proc) { " ^
    "Write-Host '   [WARN] App missing. Launching Firefox fallback...'; " ^
    "Start-Process 'firefox.exe' '--new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%%3AXAUUSD'; " ^
    "Start-Sleep -Seconds 3; " ^
    "$proc = Get-Process firefox | Where-Object {$_.MainWindowTitle -like '*TradingView*'} | Select-Object -First 1; " ^
  "} " ^
  "if ($proc) { " ^
    "Add-Type -AssemblyName System.Windows.Forms; " ^
    "$sw = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; " ^
    "$sh = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height; " ^
    "$hw = [int]($sw / 2); " ^
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W1 { [DllImport(\"user32.dll\")] public static extern bool MoveWindow(IntPtr h, int X, int Y, int w, int h2, bool r); [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h, int n); }' -ErrorAction SilentlyContinue; " ^
    "[W1]::ShowWindow($proc.MainWindowHandle, 3); " ^
    "Start-Sleep -Milliseconds 300; " ^
    "[W1]::ShowWindow($proc.MainWindowHandle, 1); " ^
    "Start-Sleep -Milliseconds 300; " ^
    "[W1]::MoveWindow($proc.MainWindowHandle, 0, 0, $hw, $sh, $true); " ^
  "}"
echo    Done.

:: ----------------------------------------------------------
:: STEP 2: Open Firefox with TradingView chart (right, snapped)
:: ----------------------------------------------------------
echo [2/7] Opening Firefox with chart URL (right side)...
start "" "firefox.exe" "%TV_CHART_URL%"
timeout /t 3 /nobreak >nul
powershell -Command ^
  "$proc = Get-Process firefox | Select-Object -First 1; " ^
  "if ($proc) { " ^
    "Add-Type -AssemblyName System.Windows.Forms; " ^
    "$sw = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; " ^
    "$sh = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height; " ^
    "$hw = [int]($sw / 2); " ^
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W2 { [DllImport(\"user32.dll\")] public static extern bool MoveWindow(IntPtr h, int X, int Y, int w, int h2, bool r); [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h, int n); }' -ErrorAction SilentlyContinue; " ^
    "[W2]::ShowWindow($proc.MainWindowHandle, 3); " ^
    "Start-Sleep -Milliseconds 300; " ^
    "[W2]::ShowWindow($proc.MainWindowHandle, 1); " ^
    "Start-Sleep -Milliseconds 300; " ^
    "[W2]::MoveWindow($proc.MainWindowHandle, $hw, 0, $hw, $sh, $true); " ^
  "}"
echo    Done.

:: ----------------------------------------------------------
:: STEP 3: Start mt5_bridge.py in a new terminal window
:: ----------------------------------------------------------
echo [3/7] Starting mt5_bridge.py...
if not exist "%PROJECT_DIR%" (
    echo    ERROR: Project folder not found: %PROJECT_DIR%
    echo    Please edit PROJECT_DIR at the top of this script.
    pause
    exit /b 1
)
start "MT5 Bridge" cmd /k "cd /d "%PROJECT_DIR%" && %PYTHON_CMD% mt5_bridge.py"
echo    Started in new window.
timeout /t 3 /nobreak >nul

:: ----------------------------------------------------------
:: STEP 4: Start ngrok tunnel
:: ----------------------------------------------------------
echo [4/7] Starting ngrok on port %NGROK_PORT%...
start "ngrok" cmd /k "ngrok http %NGROK_PORT%"
echo    Waiting for ngrok to initialize...
timeout /t 6 /nobreak >nul

:: ----------------------------------------------------------
:: STEP 5: Auto-extract ngrok public URL via local API
:: ----------------------------------------------------------
echo [5/7] Waiting for Ngrok tunnel...
set NGROK_URL=

:: Loop up to 15 times (30 seconds) until Ngrok assigns an HTTPS URL
for /L %%i in (1,1,15) do (
    if "!NGROK_URL!"=="" (
        timeout /t 2 /nobreak >nul
        for /f "usebackq tokens=*" %%A in (`powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:4040/api/tunnels' -ErrorAction Stop; $t = $r.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1; if ($t) { $t.public_url } } catch {}"`) do (
            set "NGROK_URL=%%A"
        )
    )
)

if "%NGROK_URL%"=="" (
    echo    [ERROR] Could not auto-detect Ngrok URL. Is Ngrok stuck?
    set /p NGROK_URL=   Paste ngrok HTTPS URL manually: 
)

echo    [OK] Detected URL: %NGROK_URL%
echo %NGROK_URL% | clip
echo    (Copied to clipboard!)

:: ----------------------------------------------------------
:: STEP 6: Update Vercel environment variable
:: ----------------------------------------------------------
echo [6/7] Updating Vercel env: %VERCEL_ENV_KEY%...
cd /d "%VERCEL_PROJECT_DIR%"

:: Remove existing env var
echo    Removing old env var...
call vercel env rm %VERCEL_ENV_KEY% production --yes 2>nul
echo    Old env var removed (or did not exist).

:: Write the ngrok URL to a temp file, then feed it as stdin to vercel env add
:: This avoids the interactive prompt bug that closes the terminal
echo    Adding new env var: %NGROK_URL%
set TMPFILE=%TEMP%\ngrok_url_tmp.txt
echo %NGROK_URL%> "%TMPFILE%"
call vercel env add %VERCEL_ENV_KEY% production < "%TMPFILE%"
del "%TMPFILE%" 2>nul
echo    Env var added.

:: Deploy to production
echo    Deploying to Vercel production...
call vercel --prod --yes
echo    Vercel deploy triggered.

:: ----------------------------------------------------------
:: STEP 7: Open the live dashboard
:: ----------------------------------------------------------
:: ----------------------------------------------------------
echo [7/7] Opening dashboard: %VERCEL_DASHBOARD%...
timeout /t 8 /nobreak >nul
start "" "chrome.exe" "%VERCEL_DASHBOARD%"

:: ----------------------------------------------------------
:: Done!
:: ----------------------------------------------------------
echo.
echo  =====================================================
echo   ALL DONE! Your trading setup is live.
echo   ngrok URL: %NGROK_URL%
echo  =====================================================
echo.
pause