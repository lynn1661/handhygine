#!/bin/bash

# 后端服务调试脚本
echo "🔍 开始调试后端服务..."

echo "1. 检查所有容器状态:"
sudo docker-compose ps

echo -e "\n2. 检查后端容器详细状态:"
sudo docker ps -a | grep backend

echo -e "\n3. 查看后端服务日志 (最近50行):"
sudo docker-compose logs --tail=50 backend

echo -e "\n4. 检查端口3000占用情况:"
sudo netstat -tlnp | grep :3000

echo -e "\n5. 测试容器内部网络连接:"
sudo docker exec $(sudo docker-compose ps -q backend) curl -f http://localhost:3000 2>/dev/null || echo "容器内部访问失败"

echo -e "\n6. 检查容器启动命令:"
sudo docker inspect $(sudo docker-compose ps -q backend) | grep -A 10 "Cmd"

echo -e "\n7. 检查后端Dockerfile:"
if [ -f "ai-handwash-assist-server-main/Dockerfile" ]; then
    echo "后端Dockerfile存在"
    cat ai-handwash-assist-server-main/Dockerfile
else
    echo "❌ 后端Dockerfile不存在"
fi

echo -e "\n8. 检查环境变量:"
sudo docker exec $(sudo docker-compose ps -q backend) env | grep -E "(PORT|NODE_ENV|DATABASE)" || echo "无相关环境变量"

echo -e "\n🔍 调试信息收集完成" 