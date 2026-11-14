# ============================================================
#  Journex Production Background Runner
#  Launches Backend, MT5 Bridge, and Cloudflare Tunnel silently
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path "$projectRoot\mt5_bridge.py")) {
    $projectRoot = "d:\FOR RENDO (ONLY )\Personal Project\Sass\Journex (CFD-Terminal)"
}

Set-Location $projectRoot

$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Initiating background production services..."

# ── 1. Ensure PostgreSQL is active ──────────────────────────
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne "Running" }
if ($pgService) {
    try {
        Start-Service $pgService.Name
        Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Started PostgreSQL service: $($pgService.Name)"
    } catch {
        Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] PostgreSQL start warning: $_"
    }
}

# ── 2. Start MT5 Python Bridge on port 5003 ─────────────────
$bridgePortOccupied = Get-NetTCPConnection -LocalPort 5003 -ErrorAction SilentlyContinue
if (-not $bridgePortOccupied) {
    $pythonwExe = Join-Path $projectRoot ".venv\Scripts\pythonw.exe"
    if (-not (Test-Path $pythonwExe)) {
        $pythonwExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
    }
    if (-not (Test-Path $pythonwExe)) {
        $pythonwExe = "python"
    }

    $bridgeScript = Join-Path $projectRoot "mt5_bridge.py"
    $bridgeOut = Join-Path $logsDir "mt5_bridge.log"
    $bridgeErr = Join-Path $logsDir "mt5_bridge_error.log"

    Start-Process -FilePath $pythonwExe `
        -ArgumentList "`"$bridgeScript`"" `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $bridgeOut `
        -RedirectStandardError $bridgeErr

    Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Spawned MT5 Bridge (port 5003)"
} else {
    Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Port 5003 already active"
}

# ── 3. Start Backend Node.js on port 5000 ───────────────────
$backendPortOccupied = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if (-not $backendPortOccupied) {
    $backendDir = Join-Path $projectRoot "backend"
    $backendDist = Join-Path $backendDir "dist\server.js"
    $backendOut = Join-Path $logsDir "backend.log"
    $backendErr = Join-Path $logsDir "backend_error.log"

    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodeExe) { $nodeExe = "node" }

    if (Test-Path $backendDist) {
        Start-Process -FilePath $nodeExe `
            -ArgumentList "`"$backendDist`"" `
            -WorkingDirectory $backendDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $backendOut `
            -RedirectStandardError $backendErr
    } else {
        Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c npm run dev" `
            -WorkingDirectory $backendDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $backendOut `
            -RedirectStandardError $backendErr
    }

    Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Spawned Backend API (port 5000)"
} else {
    Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Port 5000 already active"
}

# ── 4. Start Cloudflare Tunnel ──────────────────────────────
$cfRunning = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if (-not $cfRunning) {
    $cloudflaredExe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
    if (-not $cloudflaredExe -and (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe")) {
        $cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    }
    if (-not $cloudflaredExe -and (Test-Path "C:\Program Files\cloudflared\cloudflared.exe")) {
        $cloudflaredExe = "C:\Program Files\cloudflared\cloudflared.exe"
    }

    $cfToken = "eyJhIjoiNjgyYTI2OGM1YjBlNThhMjRjMTU0Y2I2MjU1ODVlN2MiLCJ0IjoiZDg4NTUzZmItZDVlMy00OTZhLWIyNWUtOGY4ODI1NTcwYTIzIiwicyI6Ik56UXlPV0pqTnpJdE5HSmtNQzAwWW1GbExUbGtPREV0WVRObFpqZGxZVEpqTjJabSJ9"
    $cfOut = Join-Path $logsDir "cloudflared.log"
    $cfErr = Join-Path $logsDir "cloudflared_error.log"

    if ($cloudflaredExe) {
        Start-Process -FilePath $cloudflaredExe `
            -ArgumentList "tunnel run --token $cfToken" `
            -WorkingDirectory $projectRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $cfOut `
            -RedirectStandardError $cfErr

        Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Spawned Cloudflare Tunnel (Token: $cfToken)"
    } else {
        Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Cloudflare binary not found"
    }
} else {
    Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Cloudflare tunnel already running"
}

Add-Content -Path "$logsDir\startup_status.log" -Value "[$timestamp] Background startup sequence complete.`n"
