# HandHygiene Docker镜像 - Linux使用说明

## 📋 前置要求

1. **安装Docker和docker-compose**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose
   
   # CentOS/RHEL/Fedora
   sudo yum install docker docker-compose
   # 或者对于较新版本
   sudo dnf install docker docker-compose
   
   # Arch Linux
   sudo pacman -S docker docker-compose
   ```

2. **启动Docker服务**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **将用户添加到docker组（可选，避免每次使用sudo）**
   ```bash
   sudo usermod -aG docker $USER
   # 重新登录或运行：
   newgrp docker
   ```

4. **系统要求**
   - Linux发行版（Ubuntu 18.04+、CentOS 7+、Debian 9+等）
   - 至少4GB可用内存，推荐8GB
   - 至少10GB可用磁盘空间

## 🚀 部署步骤

### 方法A：使用脚本（推荐）

1. **给脚本添加执行权限**
   ```bash
   chmod +x 导入镜像.sh 启动服务.sh
   ```

2. **导入Docker镜像**
   ```bash
   ./导入镜像.sh
   ```

3. **启动服务**
   ```bash
   ./启动服务.sh
   ```

### 方法B：手动执行

1. **导入Docker镜像**
   ```bash
   # 导入前端镜像
   docker load -i handhygiene-frontend.tar
   
   # 导入后端镜像
   docker load -i handhygiene-backend.tar
   
   # 导入AI服务镜像
   docker load -i handhygiene-ai.tar
   ```

2. **验证镜像导入**
   ```bash
   docker images | grep handhygiene
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

## 🌐 访问应用

启动成功后，在浏览器中访问：
- **主应用**: http://localhost:8081
- **后端API**: http://localhost:3001
- **AI服务**: http://localhost:9501

## 📊 服务说明

| 服务名称 | 端口 | 功能描述 |
|---------|------|----------|
| frontend | 8081 | Vue.js前端应用，包含MediaPipe手部检测 |
| backend | 3001 | Node.js后端API，SQLite数据库 |
| ai | 9501 | Python AI服务，Socket.IO手势识别 |

## 🛠️ 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f ai

# 进入容器（调试用）
docker-compose exec frontend sh
docker-compose exec backend sh
docker-compose exec ai bash

# 清理停止的容器
docker system prune

# 查看系统资源使用
docker stats
```

## 🗄️ 数据持久化

数据库文件存储在：`./data/data.db`
- 用户账户信息
- 洗手记录和评分
- 性能指标数据

## ⚠️ 故障排除

### 1. 权限问题
```bash
# 如果遇到权限错误，使用sudo或将用户加入docker组
sudo docker-compose up -d
# 或
sudo usermod -aG docker $USER && newgrp docker
```

### 2. 端口冲突
```bash
# 检查端口占用
sudo netstat -tlnp | grep -E ':(8081|3001|9501)'
# 或
sudo ss -tlnp | grep -E ':(8081|3001|9501)'

# 修改docker-compose.yaml中的端口映射
```

### 3. 内存不足
```bash
# 检查内存使用
free -h
# 检查Docker内存使用
docker stats
```

### 4. 防火墙问题
```bash
# Ubuntu/Debian
sudo ufw allow 8081
sudo ufw allow 3001
sudo ufw allow 9501

# CentOS/RHEL/Fedora
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=9501/tcp
sudo firewall-cmd --reload
```

### 5. SELinux问题（CentOS/RHEL）
```bash
# 临时禁用
sudo setenforce 0

# 或配置SELinux策略
sudo setsebool -P container_manage_cgroup on
```

## 🔧 高级配置

### 1. 自定义端口
编辑 `docker-compose.yaml` 文件中的端口映射：
```yaml
ports:
  - "自定义端口:容器端口"
```

### 2. 内存限制
在 `docker-compose.yaml` 中添加：
```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

### 3. 开机自启动
```bash
# 创建systemd服务
sudo tee /etc/systemd/system/handhygiene.service > /dev/null <<EOF
[Unit]
Description=HandHygiene Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/docker-exports
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl enable handhygiene.service
sudo systemctl start handhygiene.service
```

## 📞 技术支持

如遇问题，请检查：
1. Docker服务是否正常运行：`sudo systemctl status docker`
2. 所有镜像是否成功导入：`docker images | grep handhygiene`
3. 端口是否被其他程序占用：`netstat -tlnp | grep -E ':(8081|3001|9501)'`
4. 系统内存和磁盘空间是否充足：`free -h && df -h`
5. 防火墙设置是否正确
6. SELinux配置（如适用）

## 🔍 监控和维护

```bash
# 查看容器资源使用
docker stats

# 查看日志大小
docker-compose logs --tail=100 frontend

# 清理不用的镜像和容器
docker system prune -a

# 备份数据库
cp data/data.db data/data.db.backup.$(date +%Y%m%d_%H%M%S)

# 导出镜像（备份用）
docker save handhygiene-frontend:latest | gzip > handhygiene-frontend-backup.tar.gz
```

祝使用愉快！ 🐧🎉 