# Multi-Chart Split Screen Workspace Integration

## Date
- Date: 2026-10-08

## Overview
Added an automated 3-way split screen window arrangement to the unified workspace launcher ([RUN_ALL.bat](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/RUN_ALL.bat) and [OPEN_SPLIT_SCREEN.bat](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/OPEN_SPLIT_SCREEN.bat)), powered by [scripts/split_screen_workspace.ps1](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/scripts/split_screen_workspace.ps1).

## Layout Architecture: Main Stage 50 / 25 / 25
- **Primary Stage (Left Half - 50% width, 100% height)**:
  - Application: **TradingView Desktop App** (Windows MSIX / UWP app)
  - Role: Primary institutional charting, deep indicator analysis, Pine Script Execution Engine.
- **Top-Right Stage (25% viewport - 50% width, 50% height)**:
  - Application: **Brave Browser**
  - Target URL: `https://www.tradingview.com/chart/3X4SWfYZ/?symbol=XAUUSD`
  - Role: Secondary timeframe / HTF bias / correlation monitor.
- **Bottom-Right Stage (25% viewport - 50% width, 50% height)**:
  - Application: **Microsoft Edge Browser**
  - Target URL: `https://www.tradingview.com/chart/9lWjPxXr/?symbol=XAUUSD`
  - Role: Execution entry timeframe / tick / bar replay or volume profile monitor.

## Mechanics
- **Display Detection**: Uses `[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea` to dynamically adjust to any monitor resolution and account for the Windows taskbar.
- **Chromium Sizing**: Spawns Brave and Edge with native `--new-window --window-position=X,Y --window-size=W,H` flags.
- **Win32 Snapping Guard**: Compiles an in-memory Win32 C# helper using `SetWindowPos`, `ShowWindowAsync(SW_RESTORE)`, and `EnumWindows` to unmaximize/restore and snap all windows pixel-perfect.
- **Non-blocking Execution**: Launched via `start "" powershell -WindowStyle Hidden ...` so [RUN_ALL.bat](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/RUN_ALL.bat) smoothly proceeds to run concurrent development servers (`npm run dev`).
