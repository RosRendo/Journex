# ============================================================
#  HybridTrader PowerShell Helper v2.0
#  Starts: Docker Backend, MT5 Bridge, 2x ngrok, Vercel Deploy
# ============================================================

param (
    [string]$Mode = "full"
)

$PROJECT_DIR   = "D:\Forex\dashboardkiller"
$MT5_PORT      = 5003
$BACKEND_PORT  = 5000
$DASHBOARD_URL = "https://dashboard-nine-flax-74.vercel.app"

# ── Load Windows Forms for screen dimensions ────────────────
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$sw     = $screen.Width
$sh     = $screen.Height
$halfW  = [int]($sw / 2)

# ── Win32 window positioning ────────────────────────────────
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

function Get-NgrokUrl {
    param([int]$WebPort = 4040, [string]$TargetPort = "")
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 2
        try {
            $resp  = Invoke-RestMethod -Uri "http://localhost:$WebPort/api/tunnels" -ErrorAction Stop
            $https = $resp.tunnels | Where-Object { $_.proto -eq "https" }
            if ($TargetPort -ne "") {
                $https = $https | Where-Object { $_.config.addr -like "*$TargetPort*" }
            }
            $t = $https | Select-Object -First 1
            if ($t) { return $t.public_url }
        } catch {}
        Write-Host "  ... waiting for ngrok ($WebPort)..." -ForegroundColor DarkGray
    }
    return $null
}

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host "   HYBRIDTRADER LAUNCHER v2.0" -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host ""

# ════════════════════════════════════════════════════════════
#  STEP 1 — TradingView App (LEFT half)
# ════════════════════════════════════════════════════════════
Write-Host "[1/9] Launching TradingView (Left)..." -ForegroundColor White
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
    Write-Host "  [WARN] TradingView Desktop not found, opening Chrome..." -ForegroundColor Yellow
    Start-Process "chrome" "-new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%3AXAUUSD"
    Start-Sleep -Seconds 3
    Position-Window -ProcessName "chrome" -X 0 -Y 0 -W $halfW -H $sh
}

# ════════════════════════════════════════════════════════════
#  STEP 2 — Firefox TradingView Web (RIGHT half)
# ════════════════════════════════════════════════════════════
Write-Host "[2/9] Opening Firefox TradingView Web (Right)..." -ForegroundColor White
Start-Process "firefox" "-new-window https://www.tradingview.com/chart/5DDPGPZP/?symbol=OANDA%3AXAUUSD"
Start-Sleep -Seconds 3
Position-Window -ProcessName "firefox" -X $halfW -Y 0 -W $halfW -H $sh

# ════════════════════════════════════════════════════════════
#  STEP 3 — Docker Backend + Database
# ════════════════════════════════════════════════════════════
Write-Host "[3/9] Starting Docker Backend + PostgreSQL..." -ForegroundColor White
Set-Location $PROJECT_DIR
$dockerResult = & docker-compose up -d 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] Docker failed — is Docker Desktop running?" -ForegroundColor Yellow
    Write-Host $dockerResult
    Read-Host "  Open Docker Desktop then press Enter to retry..."
    & docker-compose up -d
}
Write-Host "  [OK] Docker containers started" -ForegroundColor Green

# Wait for backend health
Write-Host "  Waiting for backend health check..." -ForegroundColor DarkGray
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$BACKEND_PORT/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host ("  [OK] Backend is healthy: " + $health.status) -ForegroundColor Green
        break
    } catch {
        Write-Host "  ... checking backend..." -ForegroundColor DarkGray
    }
}

# ════════════════════════════════════════════════════════════
#  STEP 4 — MT5 Bridge (Python, port 5003)
# ════════════════════════════════════════════════════════════
Write-Host "[4/9] Starting MT5 Bridge (port $MT5_PORT)..." -ForegroundColor White
Start-Process cmd "/k `"cd /d $PROJECT_DIR && python mt5_bridge.py`"" -WindowStyle Normal
Start-Sleep -Seconds 4
Write-Host "  [OK] MT5 Bridge started" -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 5 — ngrok for MT5 Bridge (port 5003)
# ════════════════════════════════════════════════════════════
Write-Host "[5/9] Starting ngrok for MT5 Bridge (port $MT5_PORT)..." -ForegroundColor White
Start-Process cmd "/k `"ngrok http $MT5_PORT`"" -WindowStyle Minimized

$bridgeUrl = Get-NgrokUrl -WebPort 4040
if (-not $bridgeUrl) {
    Write-Host "  [ERROR] Could not get MT5 ngrok URL!" -ForegroundColor Red
    $bridgeUrl = Read-Host "  Paste MT5 ngrok HTTPS URL manually"
}
Write-Host ("  [OK] MT5 Bridge URL: " + $bridgeUrl) -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 6 — ngrok for Backend (port 5000)
#  Note: Free ngrok only allows 1 agent. Use ngrok config for 2 tunnels.
# ════════════════════════════════════════════════════════════
Write-Host "[6/9] Starting ngrok for Backend (port $BACKEND_PORT)..." -ForegroundColor White

# Try to get it from same ngrok session (if using paid/config-based multi-tunnel)
$apiUrl = Get-NgrokUrl -WebPort 4040 -TargetPort "$BACKEND_PORT"

# Fallback: try second ngrok process on port 4041
if (-not $apiUrl) {
    Start-Process cmd "/k `"ngrok http $BACKEND_PORT`"" -WindowStyle Minimized
    $apiUrl = Get-NgrokUrl -WebPort 4041
}

if (-not $apiUrl) {
    Write-Host "  [ERROR] Could not get Backend ngrok URL!" -ForegroundColor Red
    Write-Host "  NOTE: Free ngrok only allows 1 tunnel at a time." -ForegroundColor Yellow
    Write-Host "  Either upgrade ngrok OR paste the MT5 URL for the backend too." -ForegroundColor Yellow
    $apiUrl = Read-Host "  Paste Backend ngrok HTTPS URL manually"
}
Write-Host ("  [OK] Backend API URL: " + $apiUrl) -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 7 — Update BOTH Vercel Environment Variables
# ════════════════════════════════════════════════════════════
Write-Host "[7/9] Updating Vercel environment variables..." -ForegroundColor White
Set-Location "$PROJECT_DIR\frontend"

# Update NEXT_PUBLIC_BRIDGE_URL
Write-Host "  Setting NEXT_PUBLIC_BRIDGE_URL = $bridgeUrl" -ForegroundColor DarkGray
& vercel env rm NEXT_PUBLIC_BRIDGE_URL production --yes 2>$null
$bridgeUrl | Out-File "$env:TEMP\bridge_url.txt" -Encoding ascii -NoNewline
cmd.exe /c "vercel env add NEXT_PUBLIC_BRIDGE_URL production < %TEMP%\bridge_url.txt"
Remove-Item "$env:TEMP\bridge_url.txt" -ErrorAction SilentlyContinue
Write-Host "  [OK] NEXT_PUBLIC_BRIDGE_URL set" -ForegroundColor Green

# Update NEXT_PUBLIC_API_URL
Write-Host "  Setting NEXT_PUBLIC_API_URL = $apiUrl" -ForegroundColor DarkGray
& vercel env rm NEXT_PUBLIC_API_URL production --yes 2>$null
$apiUrl | Out-File "$env:TEMP\api_url.txt" -Encoding ascii -NoNewline
cmd.exe /c "vercel env add NEXT_PUBLIC_API_URL production < %TEMP%\api_url.txt"
Remove-Item "$env:TEMP\api_url.txt" -ErrorAction SilentlyContinue
Write-Host "  [OK] NEXT_PUBLIC_API_URL set" -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 8 — Deploy to Vercel Production
# ════════════════════════════════════════════════════════════
Write-Host "[8/9] Deploying to Vercel..." -ForegroundColor White
$deployOutput = & vercel --prod --yes 2>&1
Write-Host $deployOutput
Write-Host "  [OK] Vercel deployed!" -ForegroundColor Green

# ════════════════════════════════════════════════════════════
#  STEP 9 — Open Dashboard
# ════════════════════════════════════════════════════════════
Write-Host "[9/9] Opening Dashboard..." -ForegroundColor White
Start-Sleep -Seconds 8
Start-Process "firefox" "-new-tab $DASHBOARD_URL"

# Copy bridge URL to clipboard
$bridgeUrl | Set-Clipboard

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "   ALL DONE! Trading Setup is LIVE." -ForegroundColor Green
Write-Host ""
Write-Host ("   MT5 Bridge:  " + $bridgeUrl) -ForegroundColor Cyan
Write-Host ("   Backend API: " + $apiUrl) -ForegroundColor Cyan
Write-Host ("   Dashboard:   " + $DASHBOARD_URL) -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
