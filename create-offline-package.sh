#!/bin/bash

echo "📦 创建洗手检测应用离线安装包"
echo "========================================"

# 检查必要目录
if [ ! -d "ai-handwash-assist-server-main" ] || [ ! -d "new-ai-handwash-APK" ]; then
    echo "❌ 错误：未找到必要的项目目录"
    echo "请确保在包含以下目录的根目录运行此脚本："
    echo "- ai-handwash-assist-server-main/"
    echo "- new-ai-handwash-APK/"
    exit 1
fi

# 询问用户是否先清理不必要文件
echo ""
read -p "❓ 是否先清理不必要的文件？(推荐) (Y/n): " cleanup_confirm
if [[ ! $cleanup_confirm =~ ^[Nn]$ ]]; then
    echo "🧹 开始清理..."
    
    # 执行清理脚本
    if [ -f "cleanup-backend.sh" ]; then
        echo "清理后端..."
        bash cleanup-backend.sh
    fi
    
    if [ -f "cleanup-frontend.sh" ]; then
        echo "清理前端..."
        bash cleanup-frontend.sh
    fi
fi

# 设置包名
PACKAGE_NAME="handwash-offline-$(date +%Y%m%d_%H%M%S)"
PACKAGE_DIR="$PACKAGE_NAME"

echo ""
echo "📁 创建打包目录: $PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 复制后端文件
echo "📄 复制后端文件..."
cp -r ai-handwash-assist-server-main "$PACKAGE_DIR/backend"

# 从后端中移除不必要的文件（如果之前没有清理）
echo "🧹 清理后端不必要文件..."
cd "$PACKAGE_DIR/backend"
rm -f package.json package-lock.json server.js .npmrc 2>/dev/null
rm -rf node_modules/ .elasticbeanstalk/ 2>/dev/null
rm -f Dockerfile .dockerignore captain-definition 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null
cd ../..

# 检查前端构建
echo ""
echo "🔧 准备前端文件..."
cd new-ai-handwash-APK

# 确保切换到HTTP API模式
echo "🔄 切换到HTTP API模式..."
node switch-api.js http

# 构建前端
echo "🏗️  构建前端应用..."
npm install
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败，dist目录不存在"
    exit 1
fi

# 复制构建产物
cp -r dist "../$PACKAGE_DIR/frontend"

# 复制必要的前端文件（用于开发模式）
mkdir -p "../$PACKAGE_DIR/frontend-dev"
cp -r src "../$PACKAGE_DIR/frontend-dev/"
cp -r public "../$PACKAGE_DIR/frontend-dev/"
cp package.json "../$PACKAGE_DIR/frontend-dev/"
cp package-lock.json "../$PACKAGE_DIR/frontend-dev/"
cp vite.config.js "../$PACKAGE_DIR/frontend-dev/"
cp index.html "../$PACKAGE_DIR/frontend-dev/"
cp switch-api.js "../$PACKAGE_DIR/frontend-dev/"
cp -f babel.config.js jsconfig.json "../$PACKAGE_DIR/frontend-dev/" 2>/dev/null

cd ..

# 创建启动脚本
echo "📝 创建启动脚本..."

# 生产环境启动脚本
cat > "$PACKAGE_DIR/start-production.sh" << 'EOF'
#!/bin/bash
echo "🚀 启动洗手检测应用 (生产模式)"
echo "========================================="

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8+"
    exit 1
fi

echo "✅ Python 版本: $(python3 --version)"

# 启动后端
echo "🔧 启动Flask后端..."
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📦 安装Python依赖..."
pip install -r requirements.txt

# 初始化数据库
if [ ! -f "data/handwash.db" ]; then
    echo "🗄️ 初始化数据库..."
    python migrate_to_sqlite.py
fi

# 启动Flask服务器
echo "🚀 启动Flask服务器..."
python app.py &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端（静态文件服务器）
echo "🌐 启动前端服务器..."
cd ../frontend
python3 -m http.server 5173 &
FRONTEND_PID=$!

echo ""
echo "✅ 应用已启动！"
echo "🌐 访问地址: http://localhost:5173"
echo "🔧 后端API: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服务器"

# 捕获中断信号
trap "echo ''; echo '🛑 正在停止服务器...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT

# 等待
wait
EOF

# 开发环境启动脚本
cat > "$PACKAGE_DIR/start-development.sh" << 'EOF'
#!/bin/bash
echo "🚀 启动洗手检测应用 (开发模式)"
echo "========================================="

# 检查必要软件
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

echo "✅ Python 版本: $(python3 --version)"
echo "✅ Node.js 版本: $(node --version)"

# 启动后端
echo "🔧 启动Flask后端..."
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📦 安装Python依赖..."
pip install -r requirements.txt

# 初始化数据库
if [ ! -f "data/handwash.db" ]; then
    echo "🗄️ 初始化数据库..."
    python migrate_to_sqlite.py
fi

# 启动Flask服务器
echo "🚀 启动Flask服务器..."
python app.py &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
cd ../frontend-dev

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 启动开发服务器
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 开发环境已启动！"
echo "🌐 访问地址: http://localhost:5173"
echo "🔧 后端API: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服务器"

# 捕获中断信号
trap "echo ''; echo '🛑 正在停止服务器...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT

# 等待
wait
EOF

# Windows 启动脚本
cat > "$PACKAGE_DIR/start-production.bat" << 'EOF'
@echo off
echo 🚀 启动洗手检测应用 (生产模式)
echo =========================================

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装，请先安装 Python 3.8+
    pause
    exit /b 1
)

echo ✅ Python 已安装

:: 启动后端
echo 🔧 启动Flask后端...
cd backend

:: 检查虚拟环境
if not exist "venv" (
    echo 📦 创建Python虚拟环境...
    python -m venv venv
)

:: 激活虚拟环境
call venv\Scripts\activate

:: 安装依赖
echo 📦 安装Python依赖...
pip install -r requirements.txt

:: 初始化数据库
if not exist "data\handwash.db" (
    echo 🗄️ 初始化数据库...
    python migrate_to_sqlite.py
)

:: 启动Flask服务器
echo 🚀 启动Flask服务器...
start /b python app.py

:: 等待后端启动
timeout /t 3 /nobreak

:: 启动前端
echo 🌐 启动前端服务器...
cd ..\frontend
start /b python -m http.server 5173

echo.
echo ✅ 应用已启动！
echo 🌐 访问地址: http://localhost:5173
echo 🔧 后端API: http://localhost:8000
echo.
echo 按任意键停止服务器
pause

:: 停止服务器
taskkill /f /im python.exe >nul 2>&1
EOF

# 设置脚本可执行权限
chmod +x "$PACKAGE_DIR/start-production.sh"
chmod +x "$PACKAGE_DIR/start-development.sh"

# 创建README文件
cat > "$PACKAGE_DIR/README.md" << 'EOF'
# 洗手检测应用 - 离线安装包

## 🎯 特性

- ✅ **完全离线运行** - 无需网络连接
- ✅ **Python Flask 后端** - 轻量级API服务器
- ✅ **Vue.js 前端** - 现代化用户界面
- ✅ **SQLite 数据库** - 本地数据存储
- ✅ **MediaPipe AI** - 本地手部检测

## 🚀 快速启动

### 生产模式（推荐）
```bash
# Linux/Mac
./start-production.sh

# Windows
start-production.bat
```

### 开发模式
```bash
./start-development.sh
```

## 📋 系统要求

- **Python 3.8+** (必需)
- **Node.js 16+** (开发模式需要)
- **现代浏览器** (Chrome, Firefox, Safari, Edge)

## 🌐 访问地址

- **前端**: http://localhost:5173
- **后端API**: http://localhost:8000

## 📁 目录结构

```
handwash-offline/
├── backend/                 # Flask后端
│   ├── app.py              # 主应用
│   ├── data/               # SQLite数据库
│   └── services/           # 服务模块
├── frontend/               # 生产环境前端
├── frontend-dev/           # 开发环境前端
├── start-production.sh     # 生产启动脚本
├── start-development.sh    # 开发启动脚本
└── README.md              # 说明文档
```

## 🔧 故障排除

1. **端口被占用**: 修改脚本中的端口号
2. **Python未安装**: 从 https://python.org 下载安装
3. **权限问题**: 使用 `chmod +x *.sh` 添加执行权限

## 📞 技术支持

查看浏览器控制台和服务器日志输出获取详细错误信息。
EOF

# 创建配置文件
cat > "$PACKAGE_DIR/config.json" << 'EOF'
{
  "app": {
    "name": "洗手检测应用",
    "version": "1.0.0",
    "mode": "offline"
  },
  "server": {
    "backend_port": 8000,
    "frontend_port": 5173,
    "host": "localhost"
  },
  "database": {
    "type": "sqlite",
    "path": "backend/data/handwash.db"
  },
  "features": {
    "offline_mode": true,
    "mediapipe_local": true,
    "flask_api": true
  }
}
EOF

# 打包
echo ""
echo "📦 创建压缩包..."
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_DIR"

# 显示结果
echo ""
echo "🎉 离线安装包创建完成！"
echo "========================================"
echo "📦 安装包: ${PACKAGE_NAME}.tar.gz"
echo "📁 目录: $PACKAGE_DIR/"
echo ""
echo "📋 包含内容:"
echo "- Flask后端 (Python)"
echo "- Vue.js前端 (构建版本)"
echo "- 开发环境文件"
echo "- 启动脚本 (Linux/Mac/Windows)"
echo "- 说明文档"
echo ""
echo "🚀 使用方法:"
echo "1. 解压: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "2. 进入: cd $PACKAGE_DIR"
echo "3. 启动: ./start-production.sh"
echo "4. 访问: http://localhost:5173"
echo ""
echo "✅ 应用已完全离线化，无需网络连接！" 