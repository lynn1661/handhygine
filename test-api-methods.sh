#!/bin/bash

# API方法测试脚本
echo "🔍 测试handhygiene API不同HTTP方法..."

HOST=${1:-localhost}
PORT=${2:-3000}

echo "目标服务器: $HOST:$PORT"

# 测试端点
endpoints=(
    "/api/data/rank"
    "/api/data/rate"
    "/api/data/record"
    "/api/user/info"
)

# HTTP方法
methods=("GET" "POST")

echo -e "\n📊 API方法测试结果："
echo "========================================================"

for endpoint in "${endpoints[@]}"; do
    echo "测试端点: $endpoint"
    echo "----------------------------------------"
    
    for method in "${methods[@]}"; do
        url="http://$HOST:$PORT$endpoint"
        printf "  %-10s" "$method:"
        
        if [ "$method" = "GET" ]; then
            response=$(curl -s -X GET "$url" 2>/dev/null)
        else
            # POST with empty JSON
            response=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null)
        fi
        
        # 检查响应
        if [[ $response == *"Cannot found this function"* ]]; then
            echo "❌ Cannot found this function"
        elif [[ $response == *"success"* ]]; then
            echo "✅ 成功响应"
            echo "    响应: $(echo $response | head -c 100)..."
        elif [ -n "$response" ]; then
            echo "⚠️  有响应"
            echo "    响应: $(echo $response | head -c 100)..."
        else
            echo "💥 无响应"
        fi
    done
    echo ""
done

echo -e "\n🔍 尝试使用不同参数："
echo "========================================================"

# 尝试一些常见参数
test_params=(
    "?id=1"
    "?userId=1"
    "?limit=10"
    "?page=1"
)

for param in "${test_params[@]}"; do
    url="http://$HOST:$PORT/api/user/info$param"
    printf "%-20s" "$param:"
    
    response=$(curl -s "$url" 2>/dev/null)
    if [[ $response == *"Cannot found this function"* ]]; then
        echo "❌ Cannot found this function"
    elif [[ $response == *"success"* ]]; then
        echo "✅ 成功响应"
    elif [ -n "$response" ]; then
        echo "⚠️  $(echo $response | head -c 50)..."
    else
        echo "💥 无响应"
    fi
done

echo -e "\n🔍 API方法测试完成"
echo "💡 提示：API可能需要特定的认证token或请求参数" 