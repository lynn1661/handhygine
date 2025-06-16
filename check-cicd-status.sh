#!/bin/bash

# 检查CI/CD状态脚本
echo "🔍 检查CI/CD部署状态..."

echo "1. 检查GitHub Actions工作流文件："
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "✅ GitHub Actions配置文件存在"
else
    echo "❌ GitHub Actions配置文件不存在"
    exit 1
fi

echo -e "\n2. 最近的提交记录："
git log --oneline -5

echo -e "\n3. 当前分支信息："
git branch -v

echo -e "\n4. 远程仓库状态："
git remote -v

echo -e "\n5. 检查GitHub Secrets配置要求："
echo "请确认以下Secrets已在GitHub仓库中配置："
echo "   - EC2_SSH_KEY (EC2的SSH私钥)"
echo "   - EC2_USER (EC2用户名，如: ubuntu)"
echo "   - EC2_HOST (EC2公网IP地址)"

echo -e "\n6. GitHub Actions页面："
echo "   请访问: https://github.com/lynn1661/handhygine/actions"
echo "   查看最新workflow的执行状态"

echo -e "\n7. 如果CI/CD执行成功，EC2上应该会自动："
echo "   ✅ 拉取最新代码 (git pull origin laptoptest)"
echo "   ✅ 停止现有服务 (docker-compose down)"
echo "   ✅ 重新构建镜像 (docker-compose build)"
echo "   ✅ 启动新服务 (docker-compose up -d)"
echo "   ✅ 执行健康检查"

echo -e "\n8. 如果需要手动触发部署，可以："
echo "   - 在GitHub Actions页面手动运行workflow"
echo "   - 或在EC2上直接运行: ./deploy.sh"

echo -e "\n🔍 CI/CD状态检查完成"
echo "💡 提示：通常GitHub Actions需要1-3分钟完成部署" 