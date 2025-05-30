#!/bin/bash
echo "🚀 启动洗手检测Flask服务器"
echo "================================"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，正在创建..."
    python3 -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "📦 激活虚拟环境..."
source venv/bin/activate

# 检查依赖
echo "🔍 检查依赖..."
pip install -r requirements.txt

# 初始化数据库（如果需要）
if [ ! -f "data/handwash.db" ]; then
    echo "🗄️ 初始化数据库..."
    python migrate_to_sqlite.py
fi

# 选择启动模式
echo "请选择启动模式："
echo "1) 简化版服务器 (推荐测试)"
echo "2) 完整功能服务器"
read -p "请输入选择 (1-2): " choice

case $choice in
    1)
        echo "🚀 启动简化版Flask服务器..."
        python simple_app.py
        ;;
    2)
        echo "🚀 启动完整功能Flask服务器..."
        python app.py
        ;;
    *)
        echo "❌ 无效选择，启动简化版..."
        python simple_app.py
        ;;
esac 