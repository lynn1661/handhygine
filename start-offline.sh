#!/bin/bash

# 洗手检测应用离线启动脚本

echo "🚀 启动洗手检测应用（离线模式）"
echo "================================"

# 检查必需软件
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 错误: $1 未安装，请先安装后再运行"
        exit 1
    else
        echo "✅ $1 已安装"
    fi
}

echo "📋 检查依赖..."
check_dependency "node"
check_dependency "npm"
check_dependency "mongod"

# 检查MongoDB数据目录
MONGO_DATA_DIR="$HOME/mongodb/data"
if [ ! -d "$MONGO_DATA_DIR" ]; then
    echo "📁 创建MongoDB数据目录: $MONGO_DATA_DIR"
    mkdir -p "$MONGO_DATA_DIR"
fi

# 启动MongoDB
echo "🗄️  启动MongoDB数据库..."
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB已在运行"
else
    echo "▶️  启动MongoDB服务..."
    mongod --dbpath "$MONGO_DATA_DIR" --bind_ip 127.0.0.1 --fork --logpath "$MONGO_DATA_DIR/mongodb.log"
    sleep 3
    
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB启动成功"
    else
        echo "❌ MongoDB启动失败，请检查日志: $MONGO_DATA_DIR/mongodb.log"
        exit 1
    fi
fi

# 初始化数据库（如果需要）
echo "🔧 初始化数据库..."
cd ai-handwash-assist-server-main
if [ ! -f "node_modules/.installed" ]; then
    echo "📦 安装后端依赖..."
    npm install
    touch "node_modules/.installed"
fi

echo "🏗️  运行数据库初始化脚本..."
node scripts/init-db.js

# 启动后端服务
echo "🖥️  启动后端服务..."
npm start &
BACKEND_PID=$!
echo "后端服务PID: $BACKEND_PID"

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端服务是否启动成功
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端应用
echo "🌐 启动前端应用..."
cd ../new-ai-handwash-APK

if [ ! -f "node_modules/.installed" ]; then
    echo "📦 安装前端依赖..."
    npm install
    touch "node_modules/.installed"
fi

echo "▶️  启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!
echo "前端服务PID: $FRONTEND_PID"

# 等待前端服务启动
echo "⏳ 等待前端服务启动..."
sleep 8

# 检查前端服务是否启动成功
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 应用启动成功！"
echo "================================"
echo "📱 前端应用: http://localhost:5173"
echo "🖥️  后端服务: http://localhost:3000"
echo "🗄️  MongoDB: localhost:27017"
echo ""
echo "💡 提示："
echo "  - 确保摄像头权限已开启"
echo "  - 建议使用Chrome浏览器获得最佳体验"
echo "  - MediaPipe资源已配置为本地模式"
echo ""
echo "🛑 停止应用请按 Ctrl+C"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait 