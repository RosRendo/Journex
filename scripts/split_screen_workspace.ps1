<#
.SYNOPSIS
    Journex Trading OS - Split Screen Workspace Launcher
    Arranges TradingView Desktop (50% left), Brave (25% top-right), and Microsoft Edge (25% bottom-right).

.DESCRIPTION
    Dynamically detects primary display resolution and working area (excluding taskbar).
    Launches and snaps:
      1. TradingView Desktop app on the Left Half (50% width, 100% height)
      2. Brave browser on Top-Right Quadrant (50% width, 50% height)
         URL: https://www.tradingview.com/chart/3X4SWfYZ/?symbol=XAUUSD
      3. Microsoft Edge on Bottom-Right Quadrant (50% width, 50% height)
         URL: https://www.tradingview.com/chart/9lWjPxXr/?symbol=XAUUSD
#>

param(
    [string]$BraveUrl = "https://www.tradingview.com/chart/3X4SWfYZ/?symbol=XAUUSD",
    [string]$EdgeUrl  = "https://www.tradingview.com/chart/9lWjPxXr/?symbol=XAUUSD",
    [double]$LeftRatio = 0.50
)

# 1. Screen Dimensions & Working Area Calculation
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea

$totalWidth  = $screen.Width
$totalHeight = $screen.Height
$startX      = $screen.X
$startY      = $screen.Y

$leftWidth    = [int]($totalWidth * $LeftRatio)
$rightWidth   = $totalWidth - $leftWidth
$topHeight    = [int]($totalHeight * 0.50)
$bottomHeight = $totalHeight - $topHeight

$braveX = $startX + $leftWidth
$braveY = $startY

$edgeX  = $startX + $leftWidth
$edgeY  = $startY + $topHeight

Write-Host "Screen Working Area: Width=$totalWidth, Height=$totalHeight"
Write-Host "TradingView Bounds:  X=$startX, Y=$startY, W=$leftWidth, H=$totalHeight"
Write-Host "Brave Bounds:        X=$braveX, Y=$braveY, W=$rightWidth, H=$topHeight"
Write-Host "Edge Bounds:         X=$edgeX, Y=$edgeY, W=$rightWidth, H=$bottomHeight"

# 2. Locate Executable Paths
function Resolve-Executable {
    param([string[]]$paths, [string]$fallbackCommand)
    foreach ($p in $paths) {
        if ($p -and (Test-Path $p)) { return $p }
    }
    $cmd = Get-Command $fallbackCommand -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $fallbackCommand
}

$braveExe = Resolve-Executable @(
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:ProgramFiles(x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
) "brave"

$edgeExe = Resolve-Executable @(
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
) "msedge"

# 3. Launch Applications with Window Geometries
# Launch Brave
Write-Host "Launching Brave on Top-Right..."
$braveArgs = "--new-window --window-position=$braveX,$braveY --window-size=$rightWidth,$topHeight `"$BraveUrl`""
Start-Process -FilePath $braveExe -ArgumentList $braveArgs

# Launch Microsoft Edge
Write-Host "Launching Microsoft Edge on Bottom-Right..."
$edgeArgs = "--new-window --window-position=$edgeX,$edgeY --window-size=$rightWidth,$bottomHeight `"$EdgeUrl`""
Start-Process -FilePath $edgeExe -ArgumentList $edgeArgs

# Launch TradingView Desktop
Write-Host "Launching TradingView Desktop App..."
$tvPackage = Get-AppxPackage *TradingView* -ErrorAction SilentlyContinue | Select-Object -First 1
if ($tvPackage) {
    try {
        $appId = (Get-AppxPackageManifest $tvPackage).Package.Applications.Application.Id
        Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\$($tvPackage.PackageFamilyName)!$appId"
    } catch {
        Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\TradingView.Desktop_n534cwy3pjxzj!TradingView.Desktop"
    }
} else {
    Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\TradingView.Desktop_n534cwy3pjxzj!TradingView.Desktop"
}

# 4. Win32 Window Positioning & Snapping Guard
$win32Source = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class Win32Snap {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsZoomed(IntPtr hWnd);

    public const int SW_RESTORE = 9;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const uint SWP_FRAMECHANGED = 0x0020;

    public struct WindowRef {
        public IntPtr Handle;
        public uint ProcessId;
        public string Title;
    }

    public static List<WindowRef> GetVisibleWindows() {
        var results = new List<WindowRef>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                int len = GetWindowTextLength(hWnd);
                if (len > 0) {
                    StringBuilder sb = new StringBuilder(len + 1);
                    GetWindowText(hWnd, sb, sb.Capacity);
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    results.Add(new WindowRef {
                        Handle = hWnd,
                        ProcessId = pid,
                        Title = sb.ToString()
                    });
                }
            }
            return true;
        }, IntPtr.Zero);
        return results;
    }

    public static void Snap(IntPtr hWnd, int x, int y, int width, int height) {
        if (IsIconic(hWnd) || IsZoomed(hWnd)) {
            ShowWindowAsync(hWnd, SW_RESTORE);
            System.Threading.Thread.Sleep(60);
        }
        SetWindowPos(hWnd, IntPtr.Zero, x, y, width, height, SWP_NOZORDER | SWP_SHOWWINDOW | SWP_FRAMECHANGED);
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'Win32Snap').Type) {
    Add-Type -TypeDefinition $win32Source
}

# 5. Snapping passes (at 1.5s and 3.5s to ensure windows have initialized)
$passes = @(1500, 2000)
foreach ($delayMs in $passes) {
    Start-Sleep -Milliseconds $delayMs

    try {
        $windows = [Win32Snap]::GetVisibleWindows()

        # Cache process names for PIDs
        $procCache = @{}
        foreach ($w in $windows) {
            if (-not $procCache.ContainsKey($w.ProcessId)) {
                try {
                    $procCache[$w.ProcessId] = (Get-Process -Id $w.ProcessId -ErrorAction SilentlyContinue).ProcessName
                } catch {
                    $procCache[$w.ProcessId] = ""
                }
            }
        }

        # Snap TradingView Desktop window
        $tvWins = $windows | Where-Object { $procCache[$_.ProcessId] -eq "TradingView" }
        foreach ($w in $tvWins) {
            Write-Host "Snapping TradingView ($($w.Title)) -> Left Half"
            [Win32Snap]::Snap($w.Handle, $startX, $startY, $leftWidth, $totalHeight)
        }

        # Snap Brave window (matching TradingView chart tab)
        $braveWins = $windows | Where-Object { 
            $procCache[$_.ProcessId] -eq "brave" -and ($_.Title -match "TradingView|3X4SWfYZ|XAUUSD")
        }
        foreach ($w in $braveWins) {
            Write-Host "Snapping Brave ($($w.Title)) -> Top-Right"
            [Win32Snap]::Snap($w.Handle, $braveX, $braveY, $rightWidth, $topHeight)
        }

        # Snap Edge window (matching TradingView chart tab)
        $edgeWins = $windows | Where-Object { 
            $procCache[$_.ProcessId] -eq "msedge" -and ($_.Title -match "TradingView|9lWjPxXr|XAUUSD")
        }
        foreach ($w in $edgeWins) {
            Write-Host "Snapping Edge ($($w.Title)) -> Bottom-Right"
            [Win32Snap]::Snap($w.Handle, $edgeX, $edgeY, $rightWidth, $bottomHeight)
        }
    } catch {
        Write-Warning "Snapping pass encountered notice: $_"
    }
}

Write-Host "Split screen workspace configured successfully!"
