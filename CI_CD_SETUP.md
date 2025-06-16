# CI/CD 设置指南

本指南将帮助您设置自动化部署流程，当 `laptoptest` 分支有变更时自动部署到 AWS EC2。

## 前提条件

1. **AWS EC2 实例已配置**
   - Docker 和 Docker Compose 已安装
   - 项目代码已克隆到 EC2
   - 端口 8080, 3000, 9500 已开放

2. **GitHub 仓库设置**
   - 代码已推送到 GitHub
   - 有 `laptoptest` 分支

## 设置步骤

### 1. EC2 准备

在EC2上执行以下命令：

```bash
# 确保Docker服务运行
sudo systemctl start docker
sudo systemctl enable docker

# 将用户添加到docker组（避免每次sudo）
sudo usermod -aG docker $USER

# 克隆项目（如果还没有）
git clone <你的仓库地址> ~/handhygine
cd ~/handhygine

# 复制部署脚本并设置权限
chmod +x deploy.sh
```

### 2. GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

1. **EC2_SSH_KEY**: EC2 实例的 SSH 私钥
   ```
   -----BEGIN RSA PRIVATE KEY-----
   <你的私钥内容>
   -----END RSA PRIVATE KEY-----
   ```

2. **EC2_USER**: EC2 用户名（通常是 `ubuntu` 或 `ec2-user`）
   ```
   ubuntu
   ```

3. **EC2_HOST**: EC2 实例的公网IP地址
   ```
   12.34.56.78
   ```

### 3. 设置GitHub Secrets步骤

1. 进入GitHub仓库页面
2. 点击 `Settings` 选项卡
3. 在左侧菜单中选择 `Secrets and variables` > `Actions`
4. 点击 `New repository secret`
5. 分别添加上述三个secrets

### 4. SSH密钥获取

如果您需要获取EC2的SSH私钥：

```bash
# 在本地查看私钥内容
cat ~/.ssh/your-ec2-key.pem
```

复制完整的私钥内容（包括开头和结尾的标识行）到 `EC2_SSH_KEY` secret。

### 5. 测试部署

#### 手动测试部署脚本
在EC2上运行：
```bash
cd ~/handhygine
./deploy.sh
```

#### 测试自动化流程
1. 在本地修改代码
2. 推送到 `laptoptest` 分支：
   ```bash
   git checkout laptoptest
   git add .
   git commit -m "测试CI/CD"
   git push origin laptoptest
   ```
3. 在GitHub Actions页面查看部署状态

## 服务访问地址

部署成功后，可以通过以下地址访问服务：

- **前端应用**: `http://EC2_IP:8080`
- **后端API**: `http://EC2_IP:3000`
- **AI服务**: `http://EC2_IP:9500`

## 故障排查

### 1. 部署失败
- 检查GitHub Actions日志
- 确认EC2安全组端口已开放
- 验证SSH连接是否正常

### 2. 服务无法访问
- 在EC2上检查Docker容器状态：`sudo docker-compose ps`
- 查看容器日志：`sudo docker-compose logs`
- 检查端口占用：`sudo netstat -tlnp`

### 3. 常用调试命令

```bash
# 查看运行中的容器
sudo docker ps

# 查看所有容器（包括停止的）
sudo docker ps -a

# 查看特定服务日志
sudo docker-compose logs frontend
sudo docker-compose logs backend
sudo docker-compose logs ai

# 重启特定服务
sudo docker-compose restart frontend
```

## 备注

- CI/CD流程会在每次推送到 `laptoptest` 分支时自动触发
- 部署过程包括停止现有服务、拉取最新代码、重新构建和启动
- 健康检查确保所有服务正常运行
- 如需修改配置，编辑 `.github/workflows/deploy.yml` 文件 