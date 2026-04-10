param([string]$targetClass, [string]$targetTitle, [int]$leftX, [int]$topY, [int]$width, [int]$height)

$ErrorActionPreference = "SilentlyContinue"

try {
    if (-not ('ArrangeLib' -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ArrangeLib {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int X, int Y, int w, int h2, bool r);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@ -ErrorAction Stop
    }
} catch {
    Write-Host "Warning: Could not compile ArrangeLib type. Skipping arrangement."
    exit
}

$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$targetTitle*" } | Select-Object -First 1
if (-not $proc) {
    if ($targetClass -eq "firefox") {
        $proc = Get-Process firefox | Select-Object -First 1
    }
}

if ($proc) {
    [ArrangeLib]::ShowWindow($proc.MainWindowHandle, 3) # Maximize first sometimes helps
    Start-Sleep -Milliseconds 300
    [ArrangeLib]::ShowWindow($proc.MainWindowHandle, 1) # Normal
    Start-Sleep -Milliseconds 300
    [ArrangeLib]::MoveWindow($proc.MainWindowHandle, $leftX, $topY, $width, $height, $true)
}
