# Windows Terminal 配置文件设置脚本
# 使用方法: 右键 -> 使用 PowerShell 运行

$ErrorActionPreference = "Stop"

# 检测 Windows Terminal 配置路径
$wtPaths = @(
    "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json",
    "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json"
)

$wtPath = $null
foreach ($path in $wtPaths) {
    if (Test-Path $path) {
        $wtPath = $path
        break
    }
}

if (-not $wtPath) {
    Write-Host "❌ 未找到 Windows Terminal 配置文件。请先安装 Windows Terminal。" -ForegroundColor Red
    Write-Host ""
    Write-Host "安装方式:" -ForegroundColor Yellow
    Write-Host "1. 打开 Microsoft Store，搜索 'Windows Terminal' 安装" -ForegroundColor White
    Write-Host "2. 或运行: winget install Microsoft.WindowsTerminal" -ForegroundColor White
    exit 1
}

Write-Host "✓ 找到配置文件: $wtPath" -ForegroundColor Green

# 备份原配置
$backupPath = "$wtPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $wtPath $backupPath -Force
Write-Host "✓ 已备份原配置到: $backupPath" -ForegroundColor Green

# 读取生成的配置
$projectPath = "d:\Code\JS\Project\WIP\OA-runningVersion-v1.0.1"
$newConfigPath = "$projectPath\windows-terminal-settings.json"

if (-not (Test-Path $newConfigPath)) {
    Write-Host "❌ 未找到新生成的配置文件: $newConfigPath" -ForegroundColor Red
    exit 1
}

# 读取现有配置
$existingConfig = Get-Content $wtPath -Raw | ConvertFrom-Json
$newConfig = Get-Content $newConfigPath -Raw | ConvertFrom-Json

# 合并配置：保留原有配置，只添加我们的 OA 项目配置
$oaProfile = $newConfig.profiles.list | Where-Object { $_.name -eq "OA-主分支" }

if (-not $oaProfile) {
    Write-Host "❌ 未找到 OA-主分支 配置" -ForegroundColor Red
    exit 1
}

# 检查是否已存在 OA-主分支
$existingOAProfile = $existingConfig.profiles.list | Where-Object { $_.name -eq "OA-主分支" }
if ($existingOAProfile) {
    Write-Host "⚠️  已存在 OA-主分支 配置，将更新配置" -ForegroundColor Yellow
    # 移除旧的
    $existingConfig.profiles.list = $existingConfig.profiles.list | Where-Object { $_.name -ne "OA-主分支" }
}

# 添加新的 OA 配置
$existingConfig.profiles.list = @($oaProfile) + $existingConfig.profiles.list

# 添加快捷键
$keybindingExists = $existingConfig.keybindings | Where-Object {
    $_.keys -eq "ctrl+shift+1" -and $_.command.action -eq "newTab" -and $_.command.profile -eq "OA-主分支"
}

if (-not $keybindingExists) {
    $newKeybinding = @{
        command = @{
            action = "newTab"
            profile = "OA-主分支"
        }
        keys = "ctrl+shift+1"
    }
    $existingConfig.keybindings += $newKeybinding
}

# 保存配置
$existingConfig | ConvertTo-Json -Depth 10 | Set-Content $wtPath -Encoding UTF8

Write-Host ""
Write-Host "✅ Windows Terminal 配置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "配置内容:" -ForegroundColor Cyan
Write-Host "  • 新增 Profile: OA-主分支" -ForegroundColor White
Write-Host "    - 启动目录: $projectPath" -ForegroundColor White
Write-Host "    - 标签页颜色: 蓝色 (#0078D4)" -ForegroundColor White
Write-Host "  • 快捷键: Ctrl+Shift+1 快速打开 OA 项目" -ForegroundColor White
Write-Host ""
Write-Host "使用方法:" -ForegroundColor Yellow
Write-Host "  1. 重启 Windows Terminal 或按 Ctrl+Shift+P → 重新加载设置" -ForegroundColor White
Write-Host "  2. 点击下拉箭头，选择 'OA-主分支'" -ForegroundColor White
Write-Host "  3. 或使用快捷键: Ctrl+Shift+1" -ForegroundColor White
Write-Host ""
Write-Host "添加更多 worktree:" -ForegroundColor Yellow
Write-Host "  1. 编辑文件: $wtPath" -ForegroundColor White
Write-Host "  2. 复制 OA-主分支 配置，修改 name 和 startingDirectory" -ForegroundColor White

# 提示如何添加 worktree
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "快速添加 Worktree 配置示例:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host @"

{
    "guid": "{NEW-GUID-HERE}",
    "name": "OA-功能A",
    "source": "Windows.Terminal.PowershellCore",
    "commandline": "powershell.exe",
    "startingDirectory": "d:\\Code\\JS\\Project\\WIP\\OA-runningVersion-v1.0.1\\.worktrees\\feature-a",
    "tabColor": "#E74C3C",
    "hidden": false
}

"@ -ForegroundColor Gray

Read-Host "按 Enter 键退出"
