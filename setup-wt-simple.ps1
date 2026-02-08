# Windows Terminal Setup Script
$ErrorActionPreference = "Stop"

# Find Windows Terminal settings path
$wtPath = $null
$testPaths = @(
    "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json",
    "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json"
)

foreach ($path in $testPaths) {
    if (Test-Path $path) {
        $wtPath = $path
        break
    }
}

if (-not $wtPath) {
    Write-Host "Windows Terminal not found. Please install it first." -ForegroundColor Red
    Write-Host "Install: winget install Microsoft.WindowsTerminal" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found: $wtPath" -ForegroundColor Green

# Backup
$backup = "$wtPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $wtPath $backup -Force
Write-Host "Backup created: $backup" -ForegroundColor Green

# Read config
$config = Get-Content $wtPath -Raw | ConvertFrom-Json

# OA Profile to add
$oaProfile = @{
    guid = "{oa-project-main-branch}"
    name = "OA-Main"
    commandline = "powershell.exe"
    startingDirectory = "d:\Code\JS\Project\WIP\OA-runningVersion-v1.0.1"
    tabColor = "#0078D4"
    hidden = $false
}

# Check if exists and remove old
$config.profiles.list = @($config.profiles.list | Where-Object { $_.name -ne "OA-Main" })

# Add new profile at beginning
$config.profiles.list = @($oaProfile) + $config.profiles.list

# Save
$config | ConvertTo-Json -Depth 10 | Set-Content $wtPath -Encoding UTF8

Write-Host ""
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "New profile 'OA-Main' added with blue tab color" -ForegroundColor White
Write-Host "Directory: d:\Code\JS\Project\WIP\OA-runningVersion-v1.0.1" -ForegroundColor White
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "1. Restart Windows Terminal or press Ctrl+Shift+P -> Reload" -ForegroundColor White
Write-Host "2. Click dropdown arrow -> Select 'OA-Main'" -ForegroundColor White
