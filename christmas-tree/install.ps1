# 圣诞树项目一键安装脚本 (Windows PowerShell)
# 使用方法: 
#   1. 右键点击 install.ps1 -> 使用 PowerShell 运行
#   2. 或在 PowerShell 中运行: .\install.ps1
#   如果遇到执行策略错误，运行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[信息] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[成功] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[警告] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[错误] $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  圣诞树项目 - 一键安装脚本" -ForegroundColor Cyan
Write-Host "  适用于 Windows 系统" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
try {
    $nodeVersion = node -v 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Success "Node.js 已安装: $nodeVersion"
} catch {
    Write-Error "未检测到 Node.js"
    Write-Host ""
    Write-Host "请先安装 Node.js:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "2. 下载并安装 LTS 版本" -ForegroundColor Yellow
    Write-Host "3. 安装完成后重新运行此脚本" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查 npm
try {
    $npmVersion = npm -v 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "npm not found"
    }
    Write-Success "npm 已安装: $npmVersion"
} catch {
    Write-Error "npm 未找到，请检查 Node.js 安装"
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host ""

# 检查 package.json 是否存在
if (-not (Test-Path "package.json")) {
    Write-Error "未找到 package.json 文件"
    Write-Host "请确保在项目根目录下运行此脚本" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

# 清理旧的 node_modules（可选）
if (Test-Path "node_modules") {
    Write-Info "检测到旧的 node_modules，正在清理..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    if (Test-Path "package-lock.json") {
        Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
    }
}

# 安装依赖
Write-Info "开始安装项目依赖..."
Write-Info "正在运行 npm install..."
Write-Host ""

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
} catch {
    Write-Error "依赖安装失败"
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host ""
Write-Info "验证安装..."

# 检查关键依赖
$missingDeps = 0

$dependencies = @("react", "three", "@react-three\fiber")
foreach ($dep in $dependencies) {
    $depPath = "node_modules\$dep"
    if (-not (Test-Path $depPath)) {
        Write-Warning "$dep 未找到"
        $missingDeps++
    }
}

if ($missingDeps -eq 0) {
    Write-Success "所有关键依赖已正确安装"
} else {
    Write-Warning "部分依赖可能缺失，请检查"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Success "安装完成！"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "接下来你可以运行：" -ForegroundColor Yellow
Write-Host "  npm run dev     - 启动开发服务器" -ForegroundColor Green
Write-Host "  npm run build   - 构建生产版本" -ForegroundColor Green
Write-Host "  npm run preview - 预览构建结果" -ForegroundColor Green
Write-Host ""
Read-Host "按 Enter 键退出"

