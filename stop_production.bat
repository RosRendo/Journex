@echo off
title STOPPING JOURNEX PRODUCTION SERVICES
color 0C
echo.
echo ==============================================================
echo    Stopping background services (Backend, MT5 Bridge, Tunnel)...
echo ==============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5000,5003 -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('[OK] Freed port ' + $_.LocalPort + ' (PID: ' + $_.OwningProcess + ')') -ForegroundColor Green } catch {} }; Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force; Write-Host ('[OK] Stopped Cloudflare tunnel (PID: ' + $_.Id + ')') -ForegroundColor Green } catch {} }"

echo.
echo All production background services stopped cleanly.
timeout /t 3 >nul
