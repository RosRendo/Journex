Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\FOR RENDO (ONLY )\Personal Project\Sass\Journex (CFD-Terminal)"
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""& 'd:\FOR RENDO (ONLY )\Personal Project\Sass\Journex (CFD-Terminal)\start_production_background.ps1'""", 0, False
