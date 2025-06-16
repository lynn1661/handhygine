#!/bin/bash

# 修复后端服务脚本
echo "🔧 开始修复后端服务..."

# 1. 检查当前容器状态
echo "1. 检查容器状态："
sudo docker-compose ps

# 2. 查看后端服务日志
echo -e "\n2. 查看后端错误日志："
sudo docker-compose logs backend

# 3. 停止后端容器
echo -e "\n3. 停止后端服务进行重建："
sudo docker-compose stop backend

# 4. 删除后端容器和镜像
echo "删除旧的后端容器："
sudo docker-compose rm -f backend
sudo docker rmi $(sudo docker images | grep handhygiene | grep backend | awk '{print $3}') 2>/dev/null || echo "没有找到后端镜像"

# 5. 重新构建后端服务
echo -e "\n5. 重新构建后端服务："
sudo docker-compose build --no-cache backend

# 6. 启动后端服务
echo -e "\n6. 启动后端服务："
sudo docker-compose up -d backend

# 7. 等待服务启动
echo -e "\n7. 等待服务启动..."
sleep 15

# 8. 检查服务状态
echo -e "\n8. 检查服务状态："
sudo docker-compose ps backend

# 9. 查看启动日志
echo -e "\n9. 查看启动日志："
sudo docker-compose logs --tail=20 backend

# 10. 测试连接
echo -e "\n10. 测试后端连接："
for i in {1..3}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ 后端服务连接成功"
        break
    else
        echo "❌ 后端服务连接失败，重试 $i/3..."
        sleep 5
    fi
done

echo -e "\n🔧 修复完成" 