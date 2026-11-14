@echo off
title Journex Production Startup
color 0B

echo.
echo Launching Journex Production Services...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_production.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Startup script failed or was interrupted.
    pause
)
