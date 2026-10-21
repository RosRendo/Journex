@echo off
set "BRIDGE_DIR=%~dp0"
if not exist "%BRIDGE_DIR%mt5_bridge.py" (
    set "BRIDGE_DIR=d:\FOR RENDO (ONLY )\Personal Project\Dashboard\"
)
cd /d "%BRIDGE_DIR%"

set "PYTHON_EXE=C:\Users\ROS RENDO\AppData\Local\Programs\Python\Python314\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

"%PYTHON_EXE%" mt5_bridge.py
