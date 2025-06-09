#!/bin/bash

echo "HandHygiene服务启动工具"
echo "======================="

# 询问是否清理未使用的Docker资源
echo "是否要清理未使用的Docker资源？(y/N)"
echo "⚠️  警告: 这将删除所有未使用的容器、镜像、网络和卷"
read -r cleanup_response

if [[ "$cleanup_response" =~ ^[Yy]$ ]]; then
    echo "正在清理未使用的Docker资源..."
    docker system prune -a --volumes -f
    echo "✅ Docker资源清理完成"
    echo ""
fi

# 检查Docker和docker-compose是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装或未找到，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装或未找到，请先安装docker-compose"
    exit 1
fi

# 检查Docker服务是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker服务未运行，请启动Docker服务"
    exit 1
fi

echo "正在启动所有服务..."
docker-compose up -d

echo ""
echo "检查服务状态..."
docker-compose ps

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "访问地址："
echo "- 主应用: http://localhost:8081"
echo "- 后端API: http://localhost:3001"
echo "- AI服务: http://localhost:9501"
echo ""
echo "按 Ctrl+C 退出，或输入 'y' 查看实时日志："
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "实时日志 (按Ctrl+C退出)："
    docker-compose logs -f
fi 