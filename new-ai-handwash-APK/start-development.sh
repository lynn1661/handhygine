#!/bin/bash

echo "🚀 启动洗手检测应用开发环境"
echo "====================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查是否在正确目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在前端项目根目录运行此脚本"
    exit 1
fi

# 切换到HTTP API模式
echo "🔄 切换到HTTP API模式..."
node switch-api.js http

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 检查Flask服务器是否运行
echo "🔍 检查Flask服务器状态..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Flask服务器已运行"
else
    echo "⚠️  Flask服务器未运行，请在另一个终端启动："
    echo "   cd ../ai-handwash-assist-server-main"
    echo "   ./start_server.sh"
    echo ""
    echo "🕐 等待Flask服务器启动..."
    
    # 等待用户确认
    read -p "Flask服务器启动后，按回车继续..." 
fi

# 启动开发服务器
echo "🌐 启动Vue开发服务器..."
echo "前端地址: http://localhost:5173"
echo "后端API: http://localhost:8000"
echo "====================================="

npm run dev 