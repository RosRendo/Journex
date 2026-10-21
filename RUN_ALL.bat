@echo off
title JOURNEX TRADING OS (Unified Launcher)
color 0A

:: Locate Project Root (supports moving/copying this batch file anywhere, like Startup or Desktop)
set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%package.json" (
    set "PROJECT_DIR=d:\FOR RENDO (ONLY )\Personal Project\Dashboard\"
)

if not exist "%PROJECT_DIR%package.json" (
    echo [ERROR] Could not find Journex Dashboard directory at "%PROJECT_DIR%"
    echo Please make sure the folder "d:\FOR RENDO (ONLY )\Personal Project\Dashboard" exists.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo.
echo ==============================================================
echo    JOURNEX TRADING OS - ALL-IN-ONE DEV LAUNCHER
echo ==============================================================
echo    Workspace Root -^> %PROJECT_DIR%
echo    [1] Frontend UI       -^> http://localhost:3000
echo    [2] Backend API       -^> http://localhost:5000
echo    [3] MT5 Python Bridge -^> http://127.0.0.1:5003
echo    [4] Multi-Chart Split Screen:
echo        * Left   (50%%): TradingView Desktop App
echo        * Top-R  (25%%): Brave  [XAUUSD 3X4SWfYZ]
echo        * Bot-R  (25%%): Edge   [XAUUSD 9lWjPxXr]
echo ==============================================================
echo    Press Ctrl+C at any time to shut down all services.
echo.

REM Launch the 3-way split screen workspace asynchronously
if exist "%PROJECT_DIR%scripts\split_screen_workspace.ps1" (
    start "" powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\split_screen_workspace.ps1"
)

npm run dev
pause
