@echo off
title JOURNEX - 3-WAY SPLIT SCREEN WORKSPACE
color 0B

set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%scripts\split_screen_workspace.ps1" (
    set "PROJECT_DIR=d:\FOR RENDO (ONLY )\Personal Project\Dashboard\"
)

cd /d "%PROJECT_DIR%"

echo.
echo ==============================================================
echo    JOURNEX TRADING OS - 3-WAY SPLIT SCREEN LAUNCHER
echo ==============================================================
echo    Workspace Root -^> %PROJECT_DIR%
echo    * Left   (50%%): TradingView Desktop App
echo    * Top-R  (25%%): Brave  [XAUUSD 3X4SWfYZ]
echo    * Bot-R  (25%%): Edge   [XAUUSD 9lWjPxXr]
echo ==============================================================
echo.
echo Snapping split screen workspace...

powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\split_screen_workspace.ps1"

echo.
echo [OK] Workspace arranged!
timeout /t 2 > nul
