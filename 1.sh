#!/usr/bin/env bash
#
# 在 Jetson / Ubuntu 上安装 Docker Engine + Docker Compose V2（已绕过 nvidia-l4t-kernel postinst）
# 用法：
#   chmod +x install_docker_jetson.sh
#   sudo ./install_docker_jetson.sh

set -e

echo "==== 更新 apt 索引 ===="
sudo apt-get update

echo "==== 可选：移除旧版 Docker（如果存在） ===="
sudo apt-get remove --purge -y docker docker-engine docker.io containerd runc || true

echo "==== 安装基本依赖 ===="
sudo apt-get install -y ca-certificates curl gnupg lsb-release

echo "==== 添加 Docker 官方 GPG Key ===="
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "==== 添加 Docker APT 源 ===="
ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo \
  "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] \
   https://download.docker.com/linux/ubuntu \
   ${CODENAME} stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "==== 更新 apt 索引 ===="
sudo apt-get update

echo "==== 安装 Docker Engine 与 Compose V2 插件 ===="
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==== 启动并开机自启 Docker 服务 ===="
sudo systemctl enable docker
sudo systemctl start docker

echo "==== 验证安装 ===="
echo -n "Docker 版本："; docker --version
echo -n "Compose 插件版本："; docker compose version

echo "安装完成！可以使用 'docker compose up -d' 启动你的容器。"