$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"
$dashboardUrl = "https://journex-khaki.vercel.app/dashboard"
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }
$cfTunnelToken = "eyJhIjoiNjgyYTI2OGM1YjBlNThhMjRjMTU0Y2I2MjU1ODVlN2MiLCJ0IjoiZDg4NTUzZmItZDVlMy00OTZhLWIyNWUtOGY4ODI1NTcwYTIzIiwicyI6Ik56UXlPV0pqTnpJdE5HSmtNQzAwWW1GbExUbGtPREV0WVRObFpqZGxZVEpqTjJabSJ9"

$cloudflaredExe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflaredExe -and (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe")) {
    $cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}
if (-not $cloudflaredExe -and (Test-Path "C:\Program Files\cloudflared\cloudflared.exe")) {
    $cloudflaredExe = "C:\Program Files\cloudflared\cloudflared.exe"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Journex Production Startup (Cloudflare Edition)" -ForegroundColor Cyan
Write-Host "  Frontend   -> $dashboardUrl" -ForegroundColor Green
Write-Host "  Backend    -> http://localhost:5000 -> api.dashboardkiller.online" -ForegroundColor Green
Write-Host "  MT5 Bridge -> http://localhost:5003 -> python.dashboardkiller.online" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Check & Launch MetaTrader 5
$mt5Running = Get-Process terminal64 -ErrorAction SilentlyContinue
if (-not $mt5Running) {
    $mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Write-Host "[0/3] Opening MetaTrader 5..." -ForegroundColor Cyan
        Start-Process -FilePath $mt5Path
        Start-Sleep -Seconds 4
    }
} else {
    Write-Host "[0/3] MetaTrader 5 is already running." -ForegroundColor Green
}

# 1. Start Backend Express API
Write-Host "[1/3] Starting Backend API on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev"

Start-Sleep -Seconds 3

# 2. Start MT5 Python Bridge & Sync Engine
Write-Host "[2/3] Starting MT5 Python Bridge & Sync Engine on port 5003..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; & '$pythonExe' mt5_bridge.py"

Start-Sleep -Seconds 3

# 3. Start Cloudflare Tunnel
if ($cloudflaredExe) {
    Write-Host "[3/3] Starting Cloudflare Tunnel..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; & '$cloudflaredExe' tunnel run --token $cfTunnelToken"
} else {
    Write-Host "[WARN] cloudflared.exe not found. Please start it manually." -ForegroundColor Red
}

Start-Sleep -Seconds 3

Write-Host "Opening live dashboard..." -ForegroundColor Green
Start-Process $dashboardUrl

Write-Host "`nAll 3 services launched in separate windows!" -ForegroundColor Green
Write-Host "Keep them running. Close any window to stop that service.`n"
pause

