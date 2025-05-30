#!/bin/bash

echo "🚀 洗手检测应用离线环境检查"
echo "================================"

# 检查前端服务器
echo "📡 检查前端服务器..."
if curl -s http://localhost:5173/ > /dev/null; then
    echo "✅ 前端服务器运行中 (http://localhost:5173)"
else
    echo "❌ 前端服务器未运行，请执行: cd new-ai-handwash-APK && npm run dev"
fi

# 检查后端服务器
echo "🔧 检查后端服务器..."
if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ 后端服务器运行中 (http://localhost:3000)"
else
    echo "❌ 后端服务器未运行，请执行: cd ai-handwash-assist-server-main && npm start"
fi

# 检查MongoDB
echo "🗄️  检查MongoDB数据库..."
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB数据库运行中"
else
    echo "❌ MongoDB未运行，请执行: mongod --dbpath ~/mongodb/data --bind_ip 127.0.0.1"
fi

# 检查MediaPipe文件
echo "🎯 检查MediaPipe文件..."
MEDIAPIPE_DIR="new-ai-handwash-APK/public/mediapipe"

if [ -d "$MEDIAPIPE_DIR" ]; then
    echo "📁 MediaPipe目录存在"
    
    # 检查关键文件
    files=("hands.js" "hands.wasm" "hands.binarypb" "hands_solution_packed_assets.binarypb")
    all_files_exist=true
    
    for file in "${files[@]}"; do
        if [ -f "$MEDIAPIPE_DIR/$file" ]; then
            size=$(ls -lh "$MEDIAPIPE_DIR/$file" | awk '{print $5}')
            echo "✅ $file ($size)"
        else
            echo "❌ $file 缺失"
            all_files_exist=false
        fi
    done
    
    if [ "$all_files_exist" = true ]; then
        echo "✅ 所有MediaPipe核心文件已准备就绪"
    else
        echo "⚠️  部分MediaPipe文件缺失，请重新下载"
    fi
else
    echo "❌ MediaPipe目录不存在"
fi

# 检查网络连接测试
echo "🌐 测试文件访问..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/mediapipe/hands.js | grep -q "200"; then
    echo "✅ MediaPipe文件可通过HTTP访问"
else
    echo "❌ MediaPipe文件HTTP访问失败"
fi

# 总结
echo ""
echo "📋 测试链接："
echo "  - 简单测试: http://localhost:5173/mediapipe/test.html"
echo "  - 详细验证: http://localhost:5173/mediapipe/index.html" 
echo "  - 主应用: http://localhost:5173"
echo ""
echo "🎯 如果所有检查都通过，您的应用已准备好离线使用！" 