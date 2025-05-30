#!/bin/bash

echo "🧹 清理后端不必要文件..."
echo "===================================="

# 检查是否在正确目录
if [ ! -d "ai-handwash-assist-server-main" ]; then
    echo "❌ 错误：未找到 ai-handwash-assist-server-main 目录"
    echo "请在项目根目录运行此脚本"
    exit 1
fi

cd ai-handwash-assist-server-main

echo "📁 当前目录: $(pwd)"
echo ""

# 显示将要删除的文件
echo "🗑️  将要删除的文件和目录："
echo "--------------------------------"

# Node.js 相关文件
if [ -f "package.json" ]; then echo "- package.json (Node.js项目配置)"; fi
if [ -f "package-lock.json" ]; then echo "- package-lock.json (Node.js依赖锁定)"; fi
if [ -f "server.js" ]; then echo "- server.js (Node.js服务器文件)"; fi
if [ -f ".npmrc" ]; then echo "- .npmrc (npm配置文件)"; fi
if [ -d "node_modules" ]; then echo "- node_modules/ (Node.js依赖包)"; fi

# 部署相关文件
if [ -d ".elasticbeanstalk" ]; then echo "- .elasticbeanstalk/ (AWS部署配置)"; fi
if [ -f "Dockerfile" ]; then echo "- Dockerfile (Docker配置)"; fi
if [ -f ".dockerignore" ]; then echo "- .dockerignore (Docker忽略文件)"; fi
if [ -f "captain-definition" ]; then echo "- captain-definition (CapRover部署配置)"; fi

# 系统文件
find . -name ".DS_Store" -type f | while read file; do
    echo "- $file (macOS系统文件)"
done

echo "--------------------------------"
echo ""

# 询问用户确认
read -p "❓ 确认删除这些文件？(y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗑️  开始清理..."
    
    # 删除Node.js相关文件
    if [ -f "package.json" ]; then 
        rm -f package.json && echo "✅ 删除 package.json"
    fi
    if [ -f "package-lock.json" ]; then 
        rm -f package-lock.json && echo "✅ 删除 package-lock.json"
    fi
    if [ -f "server.js" ]; then 
        rm -f server.js && echo "✅ 删除 server.js"
    fi
    if [ -f ".npmrc" ]; then 
        rm -f .npmrc && echo "✅ 删除 .npmrc"
    fi
    if [ -d "node_modules" ]; then 
        rm -rf node_modules/ && echo "✅ 删除 node_modules/"
    fi

    # 删除部署相关文件
    if [ -d ".elasticbeanstalk" ]; then 
        rm -rf .elasticbeanstalk/ && echo "✅ 删除 .elasticbeanstalk/"
    fi
    if [ -f "Dockerfile" ]; then 
        rm -f Dockerfile && echo "✅ 删除 Dockerfile"
    fi
    if [ -f ".dockerignore" ]; then 
        rm -f .dockerignore && echo "✅ 删除 .dockerignore"
    fi
    if [ -f "captain-definition" ]; then 
        rm -f captain-definition && echo "✅ 删除 captain-definition"
    fi

    # 删除系统文件
    find . -name ".DS_Store" -delete && echo "✅ 删除所有 .DS_Store 文件"

    echo ""
    echo "🎉 后端清理完成！"
    echo ""
    echo "📋 保留的重要文件："
    echo "- app.py (Flask主应用)"
    echo "- simple_app.py (简化版应用)"
    echo "- requirements.txt (Python依赖)"
    echo "- start_server.sh (启动脚本)"
    echo "- venv/ (Python虚拟环境)"
    echo "- data/ (SQLite数据库)"
    echo "- services/ (服务模块)"
    
else
    echo "❌ 取消清理操作"
fi

echo ""
echo "====================================" 