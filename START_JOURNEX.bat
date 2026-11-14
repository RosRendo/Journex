@echo off
title Journex Production Launcher
cd /d "%~dp0"
echo ========================================================
echo   LAUNCHING JOURNEX PRODUCTION SERVICES (1-CLICK)
echo ========================================================
echo Starting MetaTrader 5, MT5 Bridge, Backend, and Cloudflare Tunnel...
powershell -ExecutionPolicy Bypass -File "%~dp0start_production.ps1"
pause
