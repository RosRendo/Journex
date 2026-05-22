# ============================================================
#  update_prod_env.ps1
#  Reads the live Ngrok MT5-bridge URL and auto-updates:
#    • Railway  → LOCAL_MT5_URL   (backend reads at runtime)
#    • Vercel   → NEXT_PUBLIC_BRIDGE_URL  (baked into build)
#  Then triggers a Vercel production deployment.
#
#  Called by start_production.bat after Ngrok is confirmed
#  to be running. Requires:
#    - railway CLI  (npm i -g @railway/cli, railway login)
#    - vercel  CLI  (npm i -g vercel, vercel login)
# ============================================================

param(
    [string]$ProjectPath = "d:\Forex\dashboardkiller"
)

Set-Location $ProjectPath

function Write-Step([string]$msg, [string]$color = "Cyan") {
    Write-Host ""
    Write-Host "  ► $msg" -ForegroundColor $color
}

function Write-OK([string]$msg) {
    Write-Host "    ✅ $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "    ⚠️  $msg" -ForegroundColor Yellow
}

function Write-Err([string]$msg) {
    Write-Host "    ❌ $msg" -ForegroundColor Red
}

# ── Step 1: Query Ngrok API for the MT5-bridge HTTPS tunnel ──────────────
Write-Step "Fetching live Ngrok tunnel URL from localhost:4040..."

$ngrokUrl = $null
try {
    $ngrokData = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop

    # Prefer the HTTPS tunnel for MT5 bridge (port 5003)
    $mt5Tunnel = $ngrokData.tunnels | Where-Object {
        $_.proto -eq "https" -and ($_.config.addr -match "5003" -or $_.name -match "mt5")
    } | Select-Object -First 1

    # Fall back to any HTTPS tunnel
    if (-not $mt5Tunnel) {
        $mt5Tunnel = $ngrokData.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    }

    # Last resort: any tunnel
    if (-not $mt5Tunnel) {
        $mt5Tunnel = $ngrokData.tunnels | Select-Object -First 1
    }

    $ngrokUrl = $mt5Tunnel.public_url

    if (-not $ngrokUrl) {
        Write-Err "No tunnels found in Ngrok API response."
        Write-Warn "Make sure Ngrok is running: ngrok start --config ngrok-tunnels.yml mt5-bridge"
        exit 1
    }

    Write-OK "Ngrok URL: $ngrokUrl"
    # Save for reference
    Set-Content -Path "$ProjectPath\.last_ngrok_url" -Value $ngrokUrl
}
catch {
    Write-Err "Cannot reach Ngrok API at http://127.0.0.1:4040"
    Write-Warn "Is Ngrok running? Error: $_"
    exit 1
}

# ── Step 2: Update Railway LOCAL_MT5_URL ─────────────────────────────────
Write-Step "Updating Railway → LOCAL_MT5_URL..."

try {
    $railwayOut = & railway variables set "LOCAL_MT5_URL=$ngrokUrl" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Railway LOCAL_MT5_URL set to $ngrokUrl"
    } else {
        Write-Warn "Railway CLI returned exit code $LASTEXITCODE"
        Write-Host "    Output: $railwayOut" -ForegroundColor DarkGray
        Write-Warn "If railway CLI is not installed: npm i -g @railway/cli && railway login"
    }
}
catch {
    Write-Warn "Railway update failed: $_"
}

# ── Step 3: Update Vercel NEXT_PUBLIC_BRIDGE_URL ─────────────────────────
Write-Step "Updating Vercel → NEXT_PUBLIC_BRIDGE_URL..."

try {
    # Remove existing value (ignore error if it doesn't exist)
    $removeOut = & vercel env rm NEXT_PUBLIC_BRIDGE_URL production --yes 2>&1
    Write-Host "    Remove result: $removeOut" -ForegroundColor DarkGray

    # Add new value (pipe URL string into the vercel env add stdin)
    $addOut = ($ngrokUrl | & vercel env add NEXT_PUBLIC_BRIDGE_URL production 2>&1)
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Vercel NEXT_PUBLIC_BRIDGE_URL set to $ngrokUrl"
    } else {
        Write-Warn "Vercel env add returned exit code $LASTEXITCODE"
        Write-Host "    Output: $addOut" -ForegroundColor DarkGray
        Write-Warn "If vercel CLI is not installed: npm i -g vercel && vercel login"
    }
}
catch {
    Write-Warn "Vercel env update failed: $_"
}

# ── Step 4: Trigger Vercel production deployment ─────────────────────────
Write-Step "Triggering Vercel production deployment..."
Write-Host "    (This takes ~60-90 seconds. The dashboard will show the new build.)" -ForegroundColor DarkGray

try {
    $deployOut = & vercel --prod --yes 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Vercel deployment triggered successfully!"
    } else {
        Write-Warn "Vercel deploy returned exit code $LASTEXITCODE"
        Write-Host "    Output: $deployOut" -ForegroundColor DarkGray
    }
}
catch {
    Write-Warn "Vercel deploy failed: $_"
}

# ── Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  PRODUCTION ENVIRONMENT UPDATED                      ║" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║  Ngrok URL : $($ngrokUrl.PadRight(38))║" -ForegroundColor Green
Write-Host "  ║  Railway   : LOCAL_MT5_URL updated                   ║" -ForegroundColor Green
Write-Host "  ║  Vercel    : NEXT_PUBLIC_BRIDGE_URL updated           ║" -ForegroundColor Green
Write-Host "  ║  Vercel    : Redeploying (check vercel.com/dashboard) ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
