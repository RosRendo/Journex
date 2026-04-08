# ============================================================
#  HybridTrader PowerShell Helper (Bulletproof Version)
# ============================================================

param (
    [string]$Mode = "full"
)

# ── Load Windows Forms for screen dimensions ────────────────
Add-Type -AssemblyName System.Windows.Forms
$screen  = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$sw      = $screen.Width
$sh      = $screen.Height
$halfW   = [int]($sw / 2)

# ── Safe window position function using a generic script block ──
$Code = @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@
Add-Type -TypeDefinition $Code -Language CSharp

function Position-Window {
    param($ProcessName, $X, $Y, $W, $H)
    for ($i = 0; $i -lt 10; $i++) {
        $proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($proc -and $proc.MainWindowHandle -ne 0) {
            [Win32]::ShowWindow($proc.MainWindowHandle, 3) | Out-Null
            Start-Sleep -Milliseconds 300
            [Win32]::ShowWindow($proc.MainWindowHandle, 1) | Out-Null
            Start-Sleep -Milliseconds 300
            [Win32]::MoveWindow($proc.MainWindowHandle, $X, $Y, $W, $H, $true) | Out-Null
            Write-Host ("  [OK] Positioned: " + $ProcessName) -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 1
    }
}

# ════════════════════════════════════════════════════════════
Write-Host "  HybridTrader Launcher Starting..." -ForegroundColor Cyan

# ════════════════════════════════════════════════════════════
#  STEP 1 — TradingView App (LEFT half) or Chrome Fallback
# ════════════════════════════════════════════════════════════
Write-Host "[1/7] Launching TradingView (Left)..." -ForegroundColor White

$tvPaths = @(
    "$env:LOCALAPPDATA\Programs\TradingView\TradingView.exe",
    "$env:LOCALAPPDATA\TradingView\TradingView.exe",
    "C:\Program Files\TradingView\TradingView.exe"
)
$tvExe = $tvPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($tvExe) {
    Start-Process $tvExe
    Start-Sleep -Seconds 4
    Position-Window -ProcessName "TradingView" -X 0 -Y 0 -W $halfW -H $sh
} else {
    Write-Host "  [WARN] TradingView Desktop App not found. Opening Chrome on left..." -ForegroundColor Yellow
    Start-Process "chrome" "-new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%3AXAUUSD"
    Start-Sleep -Seconds 3
    Position-Window -ProcessName "chrome" -X 0 -Y 0 -W $halfW -H $sh
}

# ════════════════════════════════════════════════════════════
#  STEP 2 — Firefox TradingView Web (RIGHT half)
# ════════════════════════════════════════════════════════════
Write-Host "[2/7] Opening Firefox TradingView Web (Right)..." -ForegroundColor White
Start-Process "firefox" "-new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%3AXAUUSD"
Start-Sleep -Seconds 3
Position-Window -ProcessName "firefox" -X $halfW -Y 0 -W $halfW -H $sh

# ════════════════════════════════════════════════════════════
#  STEP 3 — MT5 Bridge
# ════════════════════════════════════════════════════════════
Write-Host "[3/7] Starting MT5 Bridge..." -ForegroundColor White
Start-Process cmd "/k `"cd /d D:\Forex\dashboardkiller && python mt5_bridge.py`"" -WindowStyle Normal
Start-Sleep -Seconds 4

# ════════════════════════════════════════════════════════════
#  STEP 4 — Ngrok Tunnel
# ════════════════════════════════════════════════════════════
Write-Host "[4/7] Starting Ngrok on port 5003..." -ForegroundColor White
Start-Process cmd "/k `"ngrok http 5003`"" -WindowStyle Minimized

$ngrokUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $https = $resp.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($https) {
            $ngrokUrl = $https.public_url
            break
        }
    } catch {}
    Write-Host ("  ... waiting for ngrok...") -ForegroundColor DarkGray
}

if (-not $ngrokUrl) {
    Write-Host "  ERROR: Could not get ngrok URL!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ("  [OK] Ngrok URL: " + $ngrokUrl) -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 5 — Vercel Env
# ════════════════════════════════════════════════════════════
Write-Host "[5/7] Updating Vercel Env..." -ForegroundColor White
Set-Location "D:\Forex\dashboardkiller\frontend"

# Safely dump old value
& vercel env rm NEXT_PUBLIC_BRIDGE_URL production --yes 2>$null

# Safely add new value to avoid interactive prompt bugs with vercel CLI
$addCmd = "vercel env add NEXT_PUBLIC_BRIDGE_URL production < `$env:TEMP\ngrok_tmp.txt"
$ngrokUrl | Out-File "$env:TEMP\ngrok_tmp.txt" -Encoding ascii
cmd.exe /c "vercel env add NEXT_PUBLIC_BRIDGE_URL production < %TEMP%\ngrok_tmp.txt"
Remove-Item "$env:TEMP\ngrok_tmp.txt" -ErrorAction SilentlyContinue
Write-Host ("  [OK] Env updated to " + $ngrokUrl) -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 6 — Deploy to Vercel
# ════════════════════════════════════════════════════════════
Write-Host "[6/7] Deploying to Vercel..." -ForegroundColor White
$deployOutput = & vercel --prod --yes 2>&1
Write-Host $deployOutput
Write-Host "  [OK] Vercel deployed!" -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 7 — Open Dashboard
# ════════════════════════════════════════════════════════════
Write-Host "[7/7] Opening Dashboard..." -ForegroundColor White
Start-Process "firefox" "-new-tab https://dashboard-nine-flax-74.vercel.app"
Write-Host "  [OK] Done!" -ForegroundColor Green

# Copy to clipboard
$ngrokUrl | Set-Clipboard
Start-Sleep -Seconds 5
