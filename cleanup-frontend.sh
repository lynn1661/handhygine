#!/bin/bash

echo "🧹 清理前端不必要文件..."
echo "===================================="

# 检查是否在正确目录
if [ ! -d "new-ai-handwash-APK" ]; then
    echo "❌ 错误：未找到 new-ai-handwash-APK 目录"
    echo "请在项目根目录运行此脚本"
    exit 1
fi

cd new-ai-handwash-APK

echo "📁 当前目录: $(pwd)"
echo ""

# 显示将要删除的文件
echo "🗑️  将要删除的文件和目录："
echo "--------------------------------"

# 部署相关文件
if [ -f "Dockerfile" ]; then echo "- Dockerfile (Docker配置)"; fi
if [ -f ".dockerignore" ]; then echo "- .dockerignore (Docker忽略文件)"; fi
if [ -f "captain-definition" ]; then echo "- captain-definition (CapRover部署配置)"; fi
if [ -f ".gitpod.yml" ]; then echo "- .gitpod.yml (GitPod配置)"; fi

# 构建产物
if [ -d "dist" ]; then echo "- dist/ (构建产物，会重新生成)"; fi
if [ -d "dev-dist" ]; then echo "- dev-dist/ (开发构建产物)"; fi

# Android相关（如果不需要移动端）
if [ -d "android" ]; then echo "- android/ (Android应用配置) [可选]"; fi
if [ -f "capacitor.config.json" ]; then echo "- capacitor.config.json (Capacitor配置) [可选]"; fi

# 系统文件
find . -name ".DS_Store" -type f | while read file; do
    echo "- $file (macOS系统文件)"
done

echo "--------------------------------"
echo ""

# 询问是否删除Android相关文件
read -p "❓ 是否删除Android移动端相关文件？(android/, capacitor.config.json) (y/N): " delete_android

# 询问用户确认
read -p "❓ 确认删除上述文件？(y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗑️  开始清理..."
    
    # 删除部署相关文件
    if [ -f "Dockerfile" ]; then 
        rm -f Dockerfile && echo "✅ 删除 Dockerfile"
    fi
    if [ -f ".dockerignore" ]; then 
        rm -f .dockerignore && echo "✅ 删除 .dockerignore"
    fi
    if [ -f "captain-definition" ]; then 
        rm -f captain-definition && echo "✅ 删除 captain-definition"
    fi
    if [ -f ".gitpod.yml" ]; then 
        rm -f .gitpod.yml && echo "✅ 删除 .gitpod.yml"
    fi

    # 删除构建产物
    if [ -d "dist" ]; then 
        rm -rf dist/ && echo "✅ 删除 dist/"
    fi
    if [ -d "dev-dist" ]; then 
        rm -rf dev-dist/ && echo "✅ 删除 dev-dist/"
    fi

    # 可选：删除Android相关文件
    if [[ $delete_android =~ ^[Yy]$ ]]; then
        if [ -d "android" ]; then 
            rm -rf android/ && echo "✅ 删除 android/"
        fi
        if [ -f "capacitor.config.json" ]; then 
            rm -f capacitor.config.json && echo "✅ 删除 capacitor.config.json"
        fi
    fi

    # 删除系统文件
    find . -name ".DS_Store" -delete && echo "✅ 删除所有 .DS_Store 文件"

    echo ""
    echo "🎉 前端清理完成！"
    echo ""
    echo "📋 保留的重要文件："
    echo "- src/ (源代码)"
    echo "- public/ (静态资源)"
    echo "- package.json (项目配置)"
    echo "- vite.config.js (构建配置)"
    echo "- switch-api.js (API切换工具)"
    echo "- start-development.sh (开发启动脚本)"
    
    if [[ ! $delete_android =~ ^[Yy]$ ]]; then
        echo "- android/ (Android配置，已保留)"
        echo "- capacitor.config.json (Capacitor配置，已保留)"
    fi
    
else
    echo "❌ 取消清理操作"
fi

echo ""
echo "====================================" 