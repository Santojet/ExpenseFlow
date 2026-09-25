$WshShell = New-Object -ComObject WScript.Shell
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$targetScript = Join-Path $scriptDir "start_silent.vbs"

# 1. Add to Windows Startup folder (runs on PC boot)
$startupFolder = [Environment]::GetFolderPath('Startup')
$startupLnk = Join-Path $startupFolder "ExpenseFlow_AutoStart.lnk"
$shortcut = $WshShell.CreateShortcut($startupLnk)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$targetScript`""
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = "ExpenseFlow Pro AutoStart on Boot"
$shortcut.Save()

# 2. Add shortcut on Desktop (for 1-click manual launch)
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopLnk = Join-Path $desktopFolder "ExpenseFlow Pro.lnk"
$dShortcut = $WshShell.CreateShortcut($desktopLnk)
$dShortcut.TargetPath = "wscript.exe"
$dShortcut.Arguments = "`"$targetScript`""
$dShortcut.WorkingDirectory = $scriptDir
$dShortcut.Description = "Launch ExpenseFlow Pro"
$dShortcut.Save()

Write-Host "AutoStart configured successfully!"
Write-Host "1. Windows Startup Shortcut created: $startupLnk"
Write-Host "2. Desktop Shortcut created: $desktopLnk"
