#!/bin/bash

echo "HandHygiene Docker镜像导入工具"
echo "================================"

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装或未找到，请先安装Docker"
    exit 1
fi

# 检查Docker服务是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker服务未运行，请启动Docker服务"
    exit 1
fi

echo "正在导入前端镜像..."
if ! docker load -i handhygiene-frontend.tar; then
    echo "❌ 前端镜像导入失败！"
    exit 1
fi

echo "正在导入后端镜像..."
if ! docker load -i handhygiene-backend.tar; then
    echo "❌ 后端镜像导入失败！"
    exit 1
fi

echo "正在导入AI服务镜像..."
if ! docker load -i handhygiene-ai.tar; then
    echo "❌ AI服务镜像导入失败！"
    exit 1
fi

echo ""
echo "✅ 所有镜像导入成功！"
echo ""
echo "验证导入的镜像："
docker images | grep handhygiene

echo ""
echo "现在可以运行 './启动服务.sh' 或 'docker-compose up -d' 启动服务" 