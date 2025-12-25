#!/bin/bash

# 圣诞树项目一键安装脚本 (Mac M芯片)
# 使用方法: chmod +x install.sh && ./install.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否为Mac M芯片
check_architecture() {
    if [[ $(uname -m) == "arm64" ]]; then
        print_success "检测到 Mac M芯片 (ARM64)"
        return 0
    else
        print_warning "未检测到 Mac M芯片，但脚本将继续运行"
        return 0
    fi
}

# 检查并安装 Homebrew
check_homebrew() {
    if ! command_exists brew; then
        print_info "未检测到 Homebrew，正在安装..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # 如果是M芯片，添加Homebrew到PATH
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        
        print_success "Homebrew 安装完成"
    else
        print_success "Homebrew 已安装"
    fi
}

# 检查并安装 Node.js
check_nodejs() {
    if ! command_exists node; then
        print_info "未检测到 Node.js，正在通过 Homebrew 安装..."
        
        if ! command_exists brew; then
            print_error "需要先安装 Homebrew"
            exit 1
        fi
        
        brew install node
        print_success "Node.js 安装完成"
    else
        NODE_VERSION=$(node -v)
        print_success "Node.js 已安装: $NODE_VERSION"
    fi
    
    # 检查npm
    if ! command_exists npm; then
        print_error "npm 未找到，请检查 Node.js 安装"
        exit 1
    else
        NPM_VERSION=$(npm -v)
        print_success "npm 已安装: $NPM_VERSION"
    fi
}

# 安装项目依赖
install_dependencies() {
    print_info "开始安装项目依赖..."
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json 文件"
        exit 1
    fi
    
    # 清理旧的 node_modules（可选）
    if [ -d "node_modules" ]; then
        print_info "检测到旧的 node_modules，正在清理..."
        rm -rf node_modules
    fi
    
    # 安装依赖
    print_info "正在运行 npm install..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "依赖安装完成！"
    else
        print_error "依赖安装失败"
        exit 1
    fi
}

# 验证安装
verify_installation() {
    print_info "验证安装..."
    
    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        print_error "node_modules 目录不存在"
        return 1
    fi
    
    # 检查关键依赖
    local missing_deps=0
    
    if [ ! -d "node_modules/react" ]; then
        print_warning "React 未找到"
        missing_deps=1
    fi
    
    if [ ! -d "node_modules/three" ]; then
        print_warning "Three.js 未找到"
        missing_deps=1
    fi
    
    if [ ! -d "node_modules/@react-three/fiber" ]; then
        print_warning "@react-three/fiber 未找到"
        missing_deps=1
    fi
    
    if [ $missing_deps -eq 0 ]; then
        print_success "所有关键依赖已正确安装"
        return 0
    else
        print_warning "部分依赖可能缺失，请检查"
        return 1
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  圣诞树项目 - 一键安装脚本"
    echo "  适用于 Mac M芯片 (ARM64)"
    echo "=========================================="
    echo ""
    
    # 检查架构
    check_architecture
    
    # 检查并安装 Homebrew
    check_homebrew
    
    # 检查并安装 Node.js
    check_nodejs
    
    # 安装项目依赖
    install_dependencies
    
    # 验证安装
    verify_installation
    
    echo ""
    echo "=========================================="
    print_success "安装完成！"
    echo "=========================================="
    echo ""
    echo "接下来你可以运行："
    echo "  ${GREEN}npm run dev${NC}     - 启动开发服务器"
    echo "  ${GREEN}npm run build${NC}   - 构建生产版本"
    echo "  ${GREEN}npm run preview${NC} - 预览构建结果"
    echo ""
}

# 运行主函数
main

