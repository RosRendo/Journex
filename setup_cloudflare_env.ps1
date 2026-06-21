# ============================================================
#  setup_cloudflare_env.ps1
#
#  ONE-TIME setup script. Run this ONCE to bake permanent
#  Cloudflare URLs into Vercel and Railway.
#
#  After this, start_production.bat needs NO env updates —
#  the URLs never change.
#
#  Mapping:
#    python.journex.online → localhost:5003  (Cloudflare tunnel)
#    api.journex.online    → Railway backend (DNS/proxy)
#    Vercel frontend               → https://dashboard-roan-tau-xrg43s0811.vercel.app
#
#  Requirements:
#    npm i -g @railway/cli vercel
#    railway login
#    vercel login
# ============================================================

param(
    [string]$ProjectPath = "d:\Forex\journex"
)

Set-Location $ProjectPath

$BRIDGE_URL  = "https://python.journex.online"
$BACKEND_URL = "https://api.journex.online"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "  ► $msg" -ForegroundColor Cyan
}
function Write-OK([string]$msg)   { Write-Host "    ✅ $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "    ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err([string]$msg)  { Write-Host "    ❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║  Journex — One-Time Cloudflare Env Setup     ║" -ForegroundColor Cyan
Write-Host "  ║                                                      ║" -ForegroundColor Cyan
Write-Host "  ║  Bridge  → $($BRIDGE_URL.PadRight(40))║" -ForegroundColor Cyan
Write-Host "  ║  Backend → $($BACKEND_URL.PadRight(39))║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Update Railway env vars ──────────────────────────────────────
Write-Step "Updating Railway environment variables..."

$railwayVars = @{
    "LOCAL_MT5_URL"       = $BRIDGE_URL
    "NEXT_PUBLIC_BRIDGE_URL" = $BRIDGE_URL
}

foreach ($kv in $railwayVars.GetEnumerator()) {
    try {
        $out = & railway variables set "$($kv.Key)=$($kv.Value)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Railway: $($kv.Key) = $($kv.Value)"
        } else {
            Write-Warn "Railway $($kv.Key) returned exit code $LASTEXITCODE — $out"
        }
    } catch {
        Write-Warn "Railway update failed for $($kv.Key): $_"
    }
}

# ── Step 2: Update Vercel env vars ────────────────────────────────────────
Write-Step "Updating Vercel environment variables (production)..."

$vercelVars = @{
    "NEXT_PUBLIC_BRIDGE_URL"  = $BRIDGE_URL
    "NEXT_PUBLIC_BACKEND_URL" = $BACKEND_URL
    "NEXT_PUBLIC_API_URL"     = $BACKEND_URL
}

foreach ($kv in $vercelVars.GetEnumerator()) {
    try {
        # Remove old value (ignore errors if it doesn't exist)
        & vercel env rm $kv.Key production --yes 2>&1 | Out-Null

        # Add new permanent value
        $addOut = ($kv.Value | & vercel env add $kv.Key production 2>&1)
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Vercel: $($kv.Key) = $($kv.Value)"
        } else {
            Write-Warn "Vercel $($kv.Key) returned exit $LASTEXITCODE — $addOut"
        }
    } catch {
        Write-Warn "Vercel update failed for $($kv.Key): $_"
    }
}

# ── Step 3: Trigger Vercel redeploy ──────────────────────────────────────
Write-Step "Triggering Vercel production redeploy..."
Write-Host "    (This bakes the new env vars in — takes ~60-90s)" -ForegroundColor DarkGray

try {
    $deployOut = & vercel --prod --yes 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Vercel deployment triggered!"
    } else {
        Write-Warn "Vercel deploy exit $LASTEXITCODE — $deployOut"
    }
} catch {
    Write-Warn "Vercel deploy failed: $_"
}

# ── Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  ✅  ONE-TIME SETUP COMPLETE                          ║" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║  NEXT_PUBLIC_BRIDGE_URL  → python.journex.online  ║" -ForegroundColor Green
Write-Host "  ║  NEXT_PUBLIC_BACKEND_URL → api.journex.online     ║" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║  From now on just run: start_production.bat          ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
