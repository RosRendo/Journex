@echo off
title STOPPING ALL JOURNEX SERVICES
color 0C
echo.
echo ==============================================================
echo    Stopping all processes on ports 3000, 5000, 5003...
echo ==============================================================
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,5000,5003 -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('Freed port ' + $_.LocalPort + ' (PID: ' + $_.OwningProcess + ')') } catch {} }"

echo.
echo All services stopped cleanly.
ping 127.0.0.1 -n 3 >nul
