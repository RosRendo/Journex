@echo off
title Journex Personal MT5 Bridge (Option A)
color 0A

echo ========================================================
echo        JOURNEX DESKTOP CLIENT BRIDGE (OPTION A)
echo ========================================================
echo.
echo [1/3] Verifying Python Environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [2/3] Checking Required Dependencies (Flask, MetaTrader5)...
pip install -r requirements.txt --quiet --disable-pip-version-check

echo [3/3] Starting Local MT5 Bridge on http://127.0.0.1:5003 ...
echo.
echo ========================================================
echo Keep this window open while trading on Journex!
echo Pair with your dashboard at: http://localhost:3000/accounts
echo ========================================================
echo.

python client_bridge.py
pause

