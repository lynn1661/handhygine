# HandHygiene Linux原生部署指南

本指南提供了在Linux系统上不依赖Docker的完整部署方案，支持开机自启动。

## 系统要求

### 支持的操作系统
- Ubuntu 18.04+ / Debian 9+
- CentOS 7+ / RHEL 7+ / Rocky Linux 8+

### 硬件要求
- CPU: 2核心以上
- 内存: 4GB以上
- 存储: 10GB可用空间
- 网络: 互联网连接（用于下载依赖）

## 快速部署

### 1. 准备工作
```bash
# 确保以root权限运行
sudo su -

# 进入项目目录
cd /path/to/handhygiene
```

### 2. 执行部署
```bash
# 给脚本执行权限
chmod +x deploy-linux-native.sh

# 运行部署脚本
sudo ./deploy-linux-native.sh
```

### 3. 验证部署
部署完成后，访问以下地址验证服务：
- 前端应用: http://服务器IP:8081
- 后端API: http://服务器IP:3001
- AI服务: http://服务器IP:9501

## 服务架构

### 服务组件
1. **前端服务** (端口8081)
   - 基于Vue.js的Web应用
   - 通过Nginx提供静态文件服务
   - 支持PWA功能

2. **后端服务** (端口3001)
   - Node.js Express服务器
   - SQLite数据库
   - RESTful API接口

3. **AI服务** (端口9501)
   - Python Flask服务器
   - 手部动作识别AI模型
   - WebSocket实时通信

### 目录结构
```
/opt/handhygiene/
├── frontend/          # 前端应用文件
│   ├── dist/         # 构建后的静态文件
│   └── ...
├── backend/          # 后端应用文件
│   ├── server.js     # 主服务文件
│   ├── node_modules/ # Node.js依赖
│   └── ...
├── ai/               # AI服务文件
│   ├── venv/         # Python虚拟环境
│   ├── kaggle_get_one_prediction.py
│   └── ...
├── data/             # 数据目录
│   └── data.db       # SQLite数据库
└── logs/             # 日志目录
```

## 服务管理

### 系统服务
所有服务都配置为systemd服务，支持开机自启动：

- `handhygiene-backend.service` - 后端服务
- `handhygiene-ai.service` - AI服务
- `nginx.service` - Web服务器

### 管理命令

#### 查看服务状态
```bash
handhygiene-status
```

#### 重启所有服务
```bash
handhygiene-restart
```

#### 查看服务日志
```bash
# 查看所有服务日志
handhygiene-logs all

# 查看特定服务日志
handhygiene-logs backend
handhygiene-logs ai
handhygiene-logs nginx
```

#### 手动管理服务
```bash
# 启动服务
systemctl start handhygiene-backend
systemctl start handhygiene-ai
systemctl start nginx

# 停止服务
systemctl stop handhygiene-backend
systemctl stop handhygiene-ai
systemctl stop nginx

# 重启服务
systemctl restart handhygiene-backend
systemctl restart handhygiene-ai
systemctl restart nginx

# 查看服务状态
systemctl status handhygiene-backend
systemctl status handhygiene-ai
systemctl status nginx
```

## 配置说明

### Nginx配置
配置文件位置: `/etc/nginx/sites-available/handhygiene`

主要配置：
- 监听端口8081
- 静态文件服务
- API代理到后端
- WebSocket支持

### 环境变量
后端服务环境变量：
- `NODE_ENV=production`
- `DB_PATH=/opt/handhygiene/data/data.db`

AI服务环境变量：
- `PYTHONPATH=/opt/handhygiene/ai`

### 防火墙配置
自动开放的端口：
- 8081 (前端)
- 3001 (后端API)
- 9501 (AI服务)

## 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 查看详细错误信息
journalctl -u handhygiene-backend -f
journalctl -u handhygiene-ai -f

# 检查端口占用
netstat -tlnp | grep -E ':(3001|8081|9501)'
```

#### 2. 前端无法访问
```bash
# 检查Nginx状态
systemctl status nginx

# 检查Nginx配置
nginx -t

# 查看Nginx日志
tail -f /var/log/nginx/error.log
```

#### 3. 数据库问题
```bash
# 检查数据库文件权限
ls -la /opt/handhygiene/data/data.db

# 修复权限
chown handhygiene:handhygiene /opt/handhygiene/data/data.db
```

#### 4. Python依赖问题
```bash
# 重新安装Python依赖
cd /opt/handhygiene/ai
sudo -u handhygiene ./venv/bin/pip install -r requirements.txt
```

### 性能优化

#### 1. 系统资源监控
```bash
# 查看系统资源使用
htop
free -h
df -h

# 查看服务资源使用
systemctl status handhygiene-backend
systemctl status handhygiene-ai
```

#### 2. 日志管理
```bash
# 清理旧日志
journalctl --vacuum-time=7d
journalctl --vacuum-size=100M

# 配置日志轮转
# 编辑 /etc/systemd/journald.conf
SystemMaxUse=100M
SystemMaxFileSize=10M
```

## 备份与恢复

### 数据备份
```bash
# 备份数据库
cp /opt/handhygiene/data/data.db /backup/data.db.$(date +%Y%m%d)

# 备份整个应用目录
tar -czf /backup/handhygiene-$(date +%Y%m%d).tar.gz /opt/handhygiene
```

### 数据恢复
```bash
# 停止服务
systemctl stop handhygiene-backend

# 恢复数据库
cp /backup/data.db.20240101 /opt/handhygiene/data/data.db
chown handhygiene:handhygiene /opt/handhygiene/data/data.db

# 启动服务
systemctl start handhygiene-backend
```

## 卸载

如需完全卸载HandHygiene：

```bash
# 给卸载脚本执行权限
chmod +x uninstall-handhygiene.sh

# 执行卸载
sudo ./uninstall-handhygiene.sh
```

卸载脚本将删除：
- 所有应用文件和数据
- 系统服务配置
- 用户账户
- Nginx配置
- 防火墙规则

**注意**: 系统依赖包（Node.js, Python, Nginx等）不会被删除。

## 安全建议

1. **防火墙配置**
   - 仅开放必要端口
   - 考虑使用VPN或内网访问

2. **SSL/TLS加密**
   - 生产环境建议配置HTTPS
   - 可使用Let's Encrypt免费证书

3. **定期更新**
   - 定期更新系统包
   - 定期更新Node.js和Python依赖

4. **监控告警**
   - 配置服务监控
   - 设置磁盘空间告警

## 技术支持

如遇到问题，请提供以下信息：
- 操作系统版本
- 错误日志内容
- 服务状态信息
- 系统资源使用情况 