#!/bin/bash

# 测试后端服务端点脚本
echo "🔍 测试后端服务端点..."

HOST=${1:-localhost}
PORT=${2:-3000}

echo "目标服务器: $HOST:$PORT"

# 常见的API端点
endpoints=(
    "/"
    "/api"
    "/health"
    "/status"
    "/ping"
    "/info"
    "/version"
    "/services"
    "/user"
    "/data"
)

echo -e "\n📊 端点测试结果："
echo "================================"

for endpoint in "${endpoints[@]}"; do
    url="http://$HOST:$PORT$endpoint"
    printf "%-20s" "$endpoint"
    
    # 测试连接
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    case $response in
        200)
            echo "✅ 200 OK"
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
            ;;
    esac
done

echo -e "\n🔍 详细检查后端服务状态："

# 检查是否有任何响应
echo "1. 基本连接测试:"
if curl -s --connect-timeout 5 "$HOST:$PORT" > /dev/null 2>&1; then
    echo "   ✅ 服务器响应正常"
else
    echo "   ❌ 服务器无响应"
fi

# 获取响应头
echo -e "\n2. 响应头信息:"
curl -s -I "http://$HOST:$PORT/" 2>/dev/null | head -5 || echo "   无法获取响应头"

# 检查是否返回内容
echo -e "\n3. 根路径内容预览:"
response_content=$(curl -s "http://$HOST:$PORT/" 2>/dev/null | head -3)
if [ -n "$response_content" ]; then
    echo "$response_content"
else
    echo "   无内容返回"
fi

echo -e "\n🔍 端点测试完成" 