@echo off
REM 圣诞树项目一键安装脚本 (Windows)
REM 使用方法: 双击 install.bat 或在命令行运行 install.bat

chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ==========================================
echo   圣诞树项目 - 一键安装脚本
echo   适用于 Windows 系统
echo ==========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js:
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载并安装 LTS 版本
    echo 3. 安装完成后重新运行此脚本
    echo.
    pause
    exit /b 1
)

REM 显示 Node.js 版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [成功] Node.js 已安装: %NODE_VERSION%

REM 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm 未找到，请检查 Node.js 安装
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [成功] npm 已安装: %NPM_VERSION%
echo.

REM 检查 package.json 是否存在
if not exist "package.json" (
    echo [错误] 未找到 package.json 文件
    echo 请确保在项目根目录下运行此脚本
    pause
    exit /b 1
)

REM 清理旧的 node_modules（可选）
if exist "node_modules" (
    echo [信息] 检测到旧的 node_modules，正在清理...
    rmdir /s /q node_modules 2>nul
    if exist "package-lock.json" (
        del /f /q package-lock.json 2>nul
    )
)

REM 安装依赖
echo [信息] 开始安装项目依赖...
echo [信息] 正在运行 npm install...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [信息] 验证安装...

REM 检查关键依赖
set MISSING_DEPS=0

if not exist "node_modules\react" (
    echo [警告] React 未找到
    set MISSING_DEPS=1
)

if not exist "node_modules\three" (
    echo [警告] Three.js 未找到
    set MISSING_DEPS=1
)

if not exist "node_modules\@react-three\fiber" (
    echo [警告] @react-three/fiber 未找到
    set MISSING_DEPS=1
)

if %MISSING_DEPS% equ 0 (
    echo [成功] 所有关键依赖已正确安装
) else (
    echo [警告] 部分依赖可能缺失，请检查
)

echo.
echo ==========================================
echo [成功] 安装完成！
echo ==========================================
echo.
echo 接下来你可以运行：
echo   npm run dev     - 启动开发服务器
echo   npm run build   - 构建生产版本
echo   npm run preview - 预览构建结果
echo.
pause

