#!/bin/bash

echo "🚀 启动手部卫生检测系统 (Python版本)"
echo "=================================="

# 检查虚拟环境
if [ ! -d "venv39" ]; then
    echo "❌ 错误: 找不到 venv39 虚拟环境"
    echo "请先运行: $HOME/.pyenv/versions/3.9.18/bin/python -m venv venv39"
    exit 1
fi

# 激活虚拟环境
source venv39/bin/activate

# 检查Python版本
python_version=$(python --version)
echo "📋 Python版本: $python_version"

# 检查依赖
echo "🔍 检查关键依赖..."
python -c "
import sys
try:
    import flask
    import streamlit
    import mediapipe
    import torch
    print('✅ 所有依赖正常')
except ImportError as e:
    print('❌ 依赖缺失:', e)
    print('请运行: pip install -r requirements.txt')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    exit 1
fi

# 检查Flask后端是否已经运行
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Flask后端已在运行"
else
    echo "🔄 启动Flask后端..."
    python app.py &
    FLASK_PID=$!
    echo "Flask PID: $FLASK_PID"
    
    # 等待Flask启动
    echo "⏳ 等待Flask后端启动..."
    for i in {1..10}; do
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            echo "✅ Flask后端启动成功"
            break
        fi
        sleep 1
        echo "   尝试 $i/10..."
    done
fi

# 启动Streamlit前端
echo "🔄 启动Streamlit前端..."
echo "🌐 前端地址: http://localhost:8501"
echo "🌐 后端地址: http://localhost:5000"
echo ""
echo "📱 使用说明:"
echo "1. 在浏览器中访问 http://localhost:8501"
echo "2. 注册新账号或使用测试账号登录"
echo "3. 选择'手部检测'功能开始使用"
echo ""
echo "⚠️  按 Ctrl+C 退出系统"
echo "=================================="

# 启动Streamlit
streamlit run streamlit_app_complete.py --server.port 8501

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在关闭系统..."
    if [ ! -z "$FLASK_PID" ]; then
        kill $FLASK_PID 2>/dev/null
        echo "✅ Flask后端已关闭"
    fi
    echo "✅ 系统已完全关闭"
}

# 捕获退出信号
trap cleanup EXIT INT TERM 