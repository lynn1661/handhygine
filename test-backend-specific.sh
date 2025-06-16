#!/bin/bash

# 测试handhygiene项目特定端点脚本
echo "🔍 测试handhygiene后端特定端点..."

HOST=${1:-localhost}
PORT=${2:-3000}

echo "目标服务器: $HOST:$PORT"

# 基于日志分析的可能端点
endpoints=(
    # 数据相关端点
    "/data/rank"
    "/data/rate" 
    "/data/record"
    # 用户相关端点
    "/user/info"
    # 可能的REST API端点
    "/api/data/rank"
    "/api/data/rate"
    "/api/data/record"
    "/api/user/info"
    # 可能的服务端点
    "/services/data/rank"
    "/services/data/rate"
    "/services/data/record"
    "/services/user/info"
    # Socket.IO端点
    "/socket.io/"
    # 静态文件端点
    "/client"
    "/client/"
)

echo -e "\n📊 handhygiene API端点测试："
echo "=================================================="

working_endpoints=()

for endpoint in "${endpoints[@]}"; do
    url="http://$HOST:$PORT$endpoint"
    printf "%-30s" "$endpoint"
    
    # 测试连接
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    case $response in
        200)
            echo "✅ 200 OK"
            working_endpoints+=("$endpoint")
            ;;
        404)
            echo "❌ 404 Not Found"
            ;;
        500)
            echo "🔥 500 Server Error"
            ;;
        000)
            echo "💥 Connection Failed"
            ;;
        *)
            echo "⚠️  HTTP $response"
            [ "$response" != "404" ] && working_endpoints+=("$endpoint")
            ;;
    esac
done

echo -e "\n✅ 可用的端点："
if [ ${#working_endpoints[@]} -eq 0 ]; then
    echo "   暂未发现可用端点"
else
    for endpoint in "${working_endpoints[@]}"; do
        echo "   ✅ $endpoint"
    done
fi

echo -e "\n🔍 尝试获取API响应内容："
for endpoint in "${working_endpoints[@]}"; do
    echo "=== $endpoint ==="
    curl -s "http://$HOST:$PORT$endpoint" 2>/dev/null | head -5
    echo ""
done

# 测试Socket.IO连接
echo -e "\n🔌 测试Socket.IO连接："
socket_response=$(curl -s "http://$HOST:$PORT/socket.io/" 2>/dev/null)
if [ -n "$socket_response" ]; then
    echo "✅ Socket.IO响应正常"
    echo "响应内容: $socket_response" | head -1
else
    echo "❌ Socket.IO无响应"
fi

echo -e "\n🔍 特定端点测试完成" 