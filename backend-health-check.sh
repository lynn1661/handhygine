#!/bin/bash

# 后端服务健康检查脚本
echo "🏥 后端服务健康检查..."

# 检查容器是否运行
if ! sudo docker-compose ps backend | grep -q "Up"; then
    echo "❌ 后端容器未运行"
    echo "容器状态："
    sudo docker-compose ps backend
    echo "尝试启动后端服务..."
    sudo docker-compose up -d backend
    sleep 10
fi

# 详细检查
echo "📊 详细诊断信息："

echo "1. 容器状态："
sudo docker-compose ps backend

echo -e "\n2. 容器进程："
sudo docker exec $(sudo docker-compose ps -q backend) ps aux 2>/dev/null || echo "无法获取容器进程信息"

echo -e "\n3. 端口监听情况："
sudo docker exec $(sudo docker-compose ps -q backend) netstat -tlnp 2>/dev/null || echo "无法获取端口信息"

echo -e "\n4. 最新日志（最后20行）："
sudo docker-compose logs --tail=20 backend

echo -e "\n5. 测试不同端点："
endpoints=("/" "/health" "/api" "/status")
for endpoint in "${endpoints[@]}"; do
    echo "测试: http://localhost:3000$endpoint"
    curl -s -o /dev/null -w "HTTP状态码: %{http_code}, 响应时间: %{time_total}s\n" "http://localhost:3000$endpoint" || echo "连接失败"
done

echo -e "\n6. 检查容器内部网络："
sudo docker exec $(sudo docker-compose ps -q backend) curl -s http://localhost:3000 2>/dev/null && echo "容器内部网络正常" || echo "容器内部网络异常"

echo -e "\n7. 环境变量："
sudo docker exec $(sudo docker-compose ps -q backend) printenv | grep -E "(NODE|PORT|SERVER)" 2>/dev/null || echo "无相关环境变量"

echo -e "\n🏥 健康检查完成" 