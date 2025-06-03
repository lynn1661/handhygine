# Docker部署说明

## SQLite数据持久化配置

### 方案1：绑定挂载（推荐用于开发）
```yaml
volumes:
  - ./data:/app/data
```
- 数据库文件会存储在项目根目录的 `./data/` 文件夹中
- 可以直接在宿主机上查看和备份数据库文件

### 方案2：命名卷（推荐用于生产）
```yaml
volumes:
  - sqlite_data:/app/data

volumes:
  sqlite_data:
    driver: local
```

## 架构兼容性

### ARM64（Apple Silicon M1/M2）支持
本项目已优化支持ARM64架构：

- **AI服务**：使用`python:3.10-slim`基础镜像 + `requirements.txt`
- **后端服务**：使用`node:18-alpine`，原生支持多架构
- **前端服务**：使用`nginx:alpine`，原生支持多架构

### Intel x86_64支持
所有服务都完全支持x86_64架构。

## 运行命令

### 启动所有服务
```bash
docker compose up -d
```

### 查看日志
```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f ai
```

### 停止服务
```bash
docker compose down
```

### 重新构建并启动
```bash
docker compose up --build -d
```

## 数据库管理

### 查看数据库文件
```bash
# 如果使用绑定挂载
ls -la ./data/

# 进入容器查看
docker compose exec backend ls -la /app/data/
```

### 备份数据库
```bash
# 复制数据库文件到宿主机
docker compose cp backend:/app/data/data.db ./backup_$(date +%Y%m%d_%H%M%S).db
```

### 恢复数据库
```bash
# 从备份恢复
docker compose cp ./backup_20231201_120000.db backend:/app/data/data.db
docker compose restart backend
```

## 服务访问地址

- 前端应用: http://localhost:8081
- 后端API: http://localhost:3001
- AI模型服务: http://localhost:9501

## 环境变量

backend服务的环境变量：
- `NODE_ENV=production`
- `DB_PATH=/app/data/data.db`
- `PORT=3001`

## 故障排除

### 1. AI服务构建失败（PackagesNotFoundError）
**问题**：在ARM架构上出现包不可用错误
**解决方案**：项目已升级使用`requirements.txt`替代`environment.yml`

### 2. 构建上下文过大
**问题**：Docker构建时传输大量文件
**解决方案**：已添加`.dockerignore`文件优化构建

### 3. 端口冲突
**问题**：端口8081、3001或9501被占用
**解决方案**：
```bash
# 检查端口占用
lsof -i :8081
lsof -i :3001
lsof -i :9501

# 修改docker-compose.yaml中的端口映射
ports:
  - "8081:81"   # 前端  
  - "3001:3001"  # 后端
  - "9501:9501"  # AI服务
```