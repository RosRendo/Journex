@echo off
title 👏 Toggle Clapper Status
color 0E

echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │   Journex — Clapper Toggle                               │
echo  └──────────────────────────────────────────────────────────┘
echo.

powershell -Command "$process = Get-CimInstance Win32_Process -Filter \"Name = 'pythonw.exe'\" | Where-Object CommandLine -match 'clap_listener.py'; if ($process) { Start-Process 'cmd.exe' -ArgumentList '/c \"d:\FOR RENDO (ONLY )\Personal Project\Dashboard\stop_local.bat\"'; Write-Host ' [STATUS] ❌ Shutting down everything and DEACTIVATING Clapper.' -ForegroundColor Red; Write-Host '          Your PC is safe and quiet.' -ForegroundColor Gray } else { Start-Process 'wscript.exe' -ArgumentList '\"d:\FOR RENDO (ONLY )\Personal Project\Dashboard\background_clap.vbs\"'; Write-Host ' [STATUS] ✅ Background Clapper is now ACTIVATED.' -ForegroundColor Green; Write-Host '          It is listening for your double clap!' -ForegroundColor Gray }"

echo.
timeout /t 3 > nul
