#!/bin/bash

# Docker配置测试脚本
# 用途：在本地或EC2上测试Docker配置是否正常

echo "开始测试Docker配置..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装"
    exit 1
fi

# 检查Docker服务是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker服务未运行"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 检查docker-compose.yaml文件
if [ ! -f "docker-compose.yaml" ]; then
    echo "❌ 未找到docker-compose.yaml文件"
    exit 1
fi

echo "✅ Docker Compose配置文件存在"

# 验证Docker Compose配置
if ! docker-compose config &> /dev/null; then
    echo "❌ Docker Compose配置有误"
    docker-compose config
    exit 1
fi

echo "✅ Docker Compose配置验证通过"

# 检查各个子项目的Dockerfile
projects=("new-ai-handwash-APK" "ai-handwash-assist-server-main" "new-ai-handwash-server")

for project in "${projects[@]}"; do
    if [ -d "$project" ]; then
        if [ -f "$project/Dockerfile" ]; then
            echo "✅ $project/Dockerfile 存在"
        else
            echo "⚠️  $project/Dockerfile 不存在"
        fi
    else
        echo "⚠️  $project 目录不存在"
    fi
done

# 检查端口是否可用
ports=(8080 8081 3000 3001 9500 9501)

echo "检查端口占用情况..."
for port in "${ports[@]}"; do
    if netstat -tan | grep ":$port " &> /dev/null; then
        echo "⚠️  端口 $port 已被占用"
    else
        echo "✅ 端口 $port 可用"
    fi
done

echo ""
echo "测试完成！"
echo "如果所有检查都通过，您可以运行以下命令启动服务："
echo "  docker-compose up -d --build"
echo ""
echo "查看服务状态："
echo "  docker-compose ps"
echo ""
echo "查看日志："
echo "  docker-compose logs" 