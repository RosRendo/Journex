$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"
$dashboardUrl = "https://dashboard-roan-tau-xrg43s0811.vercel.app/dashboard"
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }

$cloudflaredExe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflaredExe -and (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe")) {
    $cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}
if (-not $cloudflaredExe -and (Test-Path "C:\Program Files\cloudflared\cloudflared.exe")) {
    $cloudflaredExe = "C:\Program Files\cloudflared\cloudflared.exe"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Journex Production Startup (Cloudflare Edition)" -ForegroundColor Cyan
Write-Host "  Frontend -> $dashboardUrl" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:5000 -> api.journex.online" -ForegroundColor Green
Write-Host "  Bridge   -> http://localhost:5003 -> python.journex.online" -ForegroundColor Green
Write-Host "  SyncEng  -> http://localhost:5005" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend Express API
Write-Host "[1/4] Starting Backend API on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev"

Start-Sleep -Seconds 3

# 2. Start MT5 Python Bridge
Write-Host "[2/4] Starting MT5 Python Bridge on port 5003..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; & '$pythonExe' mt5_bridge.py"

Start-Sleep -Seconds 2

# 3. Start MT5 On-Demand Sync Engine
Write-Host "[3/4] Starting MT5 Sync Engine on port 5005..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; & '$pythonExe' scripts/mt5_sync_engine.py"

Start-Sleep -Seconds 2

# 4. Start Cloudflare Tunnel
if ($cloudflaredExe) {
    Write-Host "[4/4] Starting Cloudflare Tunnel..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; & '$cloudflaredExe' tunnel --config config.yml run"
} else {
    Write-Host "[WARN] cloudflared.exe not found. Please start it manually." -ForegroundColor Red
}

Start-Sleep -Seconds 3

Write-Host "Opening live dashboard..." -ForegroundColor Green
Start-Process $dashboardUrl

Write-Host "`nAll 4 services launched in separate windows!" -ForegroundColor Green
Write-Host "Keep them running. Close any window to stop that service.`n"
pause

