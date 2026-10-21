param (
    [ValidateSet("desktop", "startup", "both", "remove")]
    [string]$Action = "both"
)

$ErrorActionPreference = "Stop"

$ProjectDir = (Get-Item -Path $PSScriptRoot).Parent.FullName
$BatFile = Join-Path $ProjectDir "RUN_ALL.bat"
$WshShell = New-Object -ComObject WScript.Shell

$DesktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$StartupPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)

$DesktopLnk = Join-Path $DesktopPath "JOURNEX_TRADING_OS.lnk"
$StartupLnk = Join-Path $StartupPath "JOURNEX_TRADING_OS.lnk"

function Create-Shortcut([string]$LnkPath) {
    $Shortcut = $WshShell.CreateShortcut($LnkPath)
    $Shortcut.TargetPath = $BatFile
    $Shortcut.WorkingDirectory = $ProjectDir
    $Shortcut.Description = "Journex Trading OS Unified Launcher"
    $Shortcut.Save()
    Write-Host "[OK] Created shortcut at: $LnkPath" -ForegroundColor Green
}

function Remove-Shortcut([string]$LnkPath) {
    if (Test-Path $LnkPath) {
        Remove-Item $LnkPath -Force
        Write-Host "[OK] Removed: $LnkPath" -ForegroundColor Yellow
    } else {
        Write-Host "[INFO] Not found: $LnkPath" -ForegroundColor DarkGray
    }
}

switch ($Action.ToLower()) {
    "desktop" {
        Create-Shortcut -LnkPath $DesktopLnk
    }
    "startup" {
        Create-Shortcut -LnkPath $StartupLnk
    }
    "both" {
        Create-Shortcut -LnkPath $DesktopLnk
        Create-Shortcut -LnkPath $StartupLnk
    }
    "remove" {
        Remove-Shortcut -LnkPath $StartupLnk
        Remove-Shortcut -LnkPath $DesktopLnk
    }
}
