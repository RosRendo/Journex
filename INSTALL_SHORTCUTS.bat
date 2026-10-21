@echo off
title JOURNEX TRADING OS - Shortcut Installer
color 0A
set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%scripts\manage_shortcuts.ps1" (
    set "PROJECT_DIR=d:\FOR RENDO (ONLY )\Personal Project\Dashboard\"
)
cd /d "%PROJECT_DIR%"

echo.
echo ==============================================================
echo    JOURNEX TRADING OS - SHORTCUT INSTALLER
echo ==============================================================
echo.
echo  [1] Create Desktop Shortcut
echo  [2] Add to Windows Startup (Launches automatically on PC boot)
echo  [3] Create Both (Desktop + Windows Startup)
echo  [4] Remove from Windows Startup ^& Desktop
echo  [5] Exit
echo.
set /p choice="Select an option (1-5): "

if "%choice%"=="1" goto desktop
if "%choice%"=="2" goto startup
if "%choice%"=="3" goto both
if "%choice%"=="4" goto remove
if "%choice%"=="5" goto end
goto end

:desktop
powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\manage_shortcuts.ps1" -Action desktop
pause
goto end

:startup
powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\manage_shortcuts.ps1" -Action startup
pause
goto end

:both
powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\manage_shortcuts.ps1" -Action both
pause
goto end

:remove
powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\manage_shortcuts.ps1" -Action remove
pause
goto end

:end
