# Flask洗手检测服务器部署指南 - 无Socket通信

## 🎯 迁移完成！

您的洗手检测应用已成功从 **Node.js + Socket.IO** 迁移到 **Python Flask + REST API**：

### ✅ 迁移优势
- **移除Socket通信** - 更简单的HTTP API
- **Python Flask** - 轻量级、易维护
- **SQLite数据库** - 完全本地存储
- **无网络依赖** - 真正的离线应用

## 🚀 快速启动

### 1. 基本启动
```bash
cd ai-handwash-assist-server-main
source venv/bin/activate
python simple_app.py
```

### 2. 完整功能启动
```bash
cd ai-handwash-assist-server-main
source venv/bin/activate
python app.py
```

### 3. 访问测试
- 服务器地址：http://localhost:8000
- 健康检查：http://localhost:8000/health
- API测试：POST http://localhost:8000/api/test

## 📊 API端点对比

### 原Node.js API → 新Flask API

| 功能 | 原端点 | 新端点 | 方法 |
|------|--------|--------|------|
| 用户登录 | `/services/user/login` | `/services/user/login` | POST |
| 用户注册 | `/services/user/register` | `/services/user/register` | POST |
| 获取用户信息 | `/services/user/getUserInfo` | `/services/user/getUserInfo` | POST |
| 提交评分 | `/services/data/rating` | `/services/data/rating` | POST |
| 获取排名 | `/services/data/getRankings` | `/services/data/getRankings` | POST |
| 健康检查 | `/health` | `/health` | GET |

### API调用示例

```bash
# 1. 检查服务器状态
curl http://localhost:8000

# 2. 用户注册
curl -X POST http://localhost:8000/services/user/register \
  -H "Content-Type: application/json" \
  -d '{"accountSerialNumber": "test001", "name": "测试用户"}'

# 3. 用户登录  
curl -X POST http://localhost:8000/services/user/login \
  -H "Content-Type: application/json" \
  -d '{"accountSerialNumber": "test001", "password": "test123"}'

# 4. 提交评分
curl -X POST http://localhost:8000/services/data/rating \
  -H "Content-Type: application/json" \
  -d '{"id": "test001", "rating": "good"}'

# 5. 获取排名
curl -X POST http://localhost:8000/services/data/getRankings \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

## 📁 项目结构

```
ai-handwash-assist-server-main/
├── app.py                 # 完整Flask应用
├── simple_app.py          # 简化测试版本
├── requirements.txt       # Python依赖
├── venv/                  # Python虚拟环境
├── data/                  # SQLite数据库文件
│   └── handwash.db       # 数据库文件
├── services/             # 服务模块
│   ├── database_service.py
│   ├── user_service.py
│   ├── rate_service.py
│   └── rank_service.py
└── migrate_to_sqlite.py  # 数据库初始化脚本
```

## 🗄️ 数据库结构

### SQLite表结构
```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_serial_number TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    password TEXT,
    device_id TEXT,
    total_sessions INTEGER DEFAULT 0,
    best_score REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评分表  
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    points REAL NOT NULL,
    step TEXT,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设备表
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT,
    device_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 配置说明

### 环境变量
```bash
# 可选的环境配置
export FLASK_ENV=development    # 开发模式
export FLASK_PORT=8000         # 端口配置
export DATABASE_PATH=./data/handwash.db  # 数据库路径
```

### 生产环境部署
```bash
# 使用Gunicorn (生产环境推荐)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app

# 或使用uWSGI
pip install uwsgi
uwsgi --http :8000 --module app:app
```

## 📱 前端集成

### JavaScript调用示例
```javascript
// 替换原来的Socket.IO调用
// 原来：socket.emit('event', data)
// 现在：fetch API调用

// 用户登录
const loginUser = async (userData) => {
    const response = await fetch('http://localhost:8000/services/user/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    });
    return await response.json();
};

// 提交评分
const submitRating = async (ratingData) => {
    const response = await fetch('http://localhost:8000/services/data/rating', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData)
    });
    return await response.json();
};
```

## 🛠️ 开发工具

### 数据库管理
```bash
# 查看数据库内容
sqlite3 data/handwash.db
.tables
SELECT * FROM users;
SELECT * FROM ratings;
```

### 日志查看
```bash
# Flask自带日志输出到控制台
# 查看实时请求日志
tail -f app.log  # 如果配置了文件日志
```

## 🚦 测试

### 单元测试（可选）
```bash
# 安装测试依赖
pip install pytest pytest-flask

# 运行测试
pytest tests/
```

### 性能测试
```bash
# 使用ab工具测试
ab -n 1000 -c 10 http://localhost:8000/

# 或使用curl测试API
for i in {1..10}; do
    curl -s http://localhost:8000/health
done
```

## 📋 部署检查清单

- [ ] Python 3.8+ 已安装
- [ ] 虚拟环境已创建并激活
- [ ] 依赖包已安装 (`pip install -r requirements.txt`)
- [ ] 数据库已初始化 (`python migrate_to_sqlite.py`)
- [ ] 服务器可正常启动 (`python app.py`)
- [ ] API端点测试通过
- [ ] 前端已更新为REST API调用

## 🎉 成功指标

当您看到以下输出时，说明Flask服务器部署成功：

```
🚀 启动洗手检测服务器 (Flask版本)
🗄️ 初始化SQLite数据库...
✅ 数据库初始化完成
✅ 服务器启动成功！
📊 数据库：SQLite (本地存储)
🌐 服务器地址：http://localhost:8000
📱 模式：完全离线
===============================
 * Running on http://127.0.0.1:8000
 * Debugger is active!
```

## 🔄 从Node.js迁移的变化

### 主要变化
1. **移除Socket.IO** → 纯REST API
2. **Node.js** → Python Flask
3. **MongoDB Realm** → SQLite
4. **实时通信** → HTTP请求/响应

### 前端需要更新的部分
1. 移除socket.io相关代码
2. 将socket事件改为HTTP API调用
3. 更新API端点URL
4. 处理HTTP状态码和错误响应

您的洗手检测应用现在已经完全**去除了Socket通信**，使用更简单的**Flask + REST API**架构，完全支持离线运行！ 