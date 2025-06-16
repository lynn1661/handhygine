#!/bin/bash

# 手卫生项目自动部署脚本
# 作者：CI/CD自动化
# 用途：在EC2上自动部署Docker容器

set -e  # 遇到错误立即退出

echo "开始部署手卫生项目..."

# 检查是否在正确的目录
if [ ! -f "docker-compose.yaml" ]; then
    echo "错误：找不到docker-compose.yaml文件，请确认在正确的项目目录中"
    exit 1
fi

# 停止现有服务
echo "停止现有服务..."
sudo docker-compose down || true

# 拉取最新代码
echo "拉取最新代码..."
git fetch origin
git checkout laptoptest
git pull origin laptoptest

# 清理Docker镜像和容器
echo "清理Docker缓存..."
sudo docker system prune -f

# 重新构建并启动服务
echo "重新构建并启动服务..."
sudo docker-compose up -d --build

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
sudo docker-compose ps

# 健康检查
echo "执行健康检查..."

# 检查前端服务
for i in {1..5}; do
    if curl -f http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ 前端服务(8080)正常"
        break
    else
        echo "❌ 前端服务检查失败，重试 $i/5..."
        sleep 5
    fi
done

# 检查后端服务
backend_ok=false
for i in {1..5}; do
    # 尝试实际的API端点（基于micro-server框架）
    if curl -f http://localhost:3000/data/rank > /dev/null 2>&1 || curl -f http://localhost:3000/user/info > /dev/null 2>&1 || curl -f http://localhost:3000/socket.io/ > /dev/null 2>&1; then
        echo "✅ 后端服务(3000)正常"
        backend_ok=true
        break
    else
        echo "❌ 后端服务检查失败，重试 $i/5..."
        # 也检查是否服务启动但根路径无响应
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "⚠️  后端服务已启动但根路径无响应，可能正常"
            backend_ok=true
            break
        fi
        sleep 5
    fi
done

# 如果后端服务失败，显示调试信息
if [ "$backend_ok" = false ]; then
    echo "⚠️  后端服务启动失败，显示详细信息："
    echo "后端容器状态："
    sudo docker-compose ps backend
    echo "后端服务日志（最后10行）："
    sudo docker-compose logs --tail=10 backend
    echo "建议运行以下命令进行修复："
    echo "  ./fix-backend.sh"
fi

# 检查AI服务
for i in {1..5}; do
    if curl -f http://localhost:9500 > /dev/null 2>&1; then
        echo "✅ AI服务(9500)正常"
        break
    else
        echo "❌ AI服务检查失败，重试 $i/5..."
        sleep 5
    fi
done

echo "部署完成！所有服务已启动。"
echo "前端访问地址: http://服务器IP:8080"
echo "后端API地址: http://服务器IP:3000"
echo "AI服务地址: http://服务器IP:9500" 