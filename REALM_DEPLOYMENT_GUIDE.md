# MongoDB Realm 边缘设备部署指南

本指南将帮助您在边缘设备上部署使用 MongoDB Realm 的洗手检测应用，实现完全离线运行。

## 🎯 为什么选择 MongoDB Realm？

### 边缘设备优势
- **本地存储**：数据直接存储在设备上，无需网络连接
- **离线优先**：应用可以完全离线工作
- **自动同步**：有网络时自动同步数据到云端
- **轻量级**：比完整的MongoDB更适合边缘设备
- **跨平台**：支持iOS、Android、Web、桌面应用

### 与传统MongoDB的对比
| 特性 | MongoDB Realm | 传统MongoDB |
|------|---------------|-------------|
| 离线支持 | ✅ 原生支持 | ❌ 需要网络 |
| 设备存储 | ✅ 本地数据库 | ❌ 远程服务器 |
| 同步机制 | ✅ 自动同步 | ❌ 手动实现 |
| 资源占用 | ✅ 轻量级 | ❌ 重量级 |
| 边缘部署 | ✅ 理想选择 | ❌ 不适合 |

## 📋 系统要求

### 硬件要求
- **CPU**: ARM64 或 x86_64
- **内存**: 最少 512MB，推荐 1GB+
- **存储**: 最少 2GB 可用空间
- **网络**: 可选（仅用于数据同步）

### 软件要求
- **Node.js**: 版本 18 或更高
- **操作系统**: Linux、macOS、Windows
- **浏览器**: Chrome 90+、Firefox 88+、Safari 14+

## 🚀 快速部署

### 步骤1：安装依赖

```bash
# 进入服务器目录
cd ai-handwash-assist-server-main

# 安装依赖
npm install

# 验证安装
node -v  # 应显示 v18.0.0 或更高
```

### 步骤2：初始化数据库

```bash
# 运行数据迁移脚本（创建示例数据）
node scripts/migrate-to-realm.js
```

### 步骤3：启动服务器

```bash
# 启动服务器
npm start

# 或者开发模式
npm run dev
```

### 步骤4：启动前端应用

```bash
# 进入前端目录
cd ../new-ai-handwash-APK

# 安装依赖
npm install

# 启动前端
npm run dev
```

## 📊 数据库结构

### Realm 数据模型

#### 用户模型 (User)
```javascript
{
  accountSerialNumber: "string",  // 主键
  name: "string",                 // 用户名
  email: "string",                // 邮箱
  password: "string",             // 加密密码
  totalSessions: "number",        // 总会话数
  bestScore: "number",            // 最佳分数
  deviceId: "string",             // 设备ID
  isOfflineUser: "boolean",       // 是否离线用户
  createdAt: "Date",              // 创建时间
  updatedAt: "Date"               // 更新时间
}
```

#### 评分模型 (Rating)
```javascript
{
  _id: "ObjectId",                // 主键
  userId: "string",               // 用户ID
  rating: "string",               // 评分等级
  points: "number",               // 分数
  step: "number",                 // 洗手步骤
  sessionId: "string",            // 会话ID
  detectionAccuracy: "number",    // 检测精度
  completionTime: "number",       // 完成时间
  deviceId: "string",             // 设备ID
  isSynced: "boolean",            // 是否已同步
  createdAt: "Date"               // 创建时间
}
```

#### 设备模型 (Device)
```javascript
{
  deviceId: "string",             // 主键
  deviceName: "string",           // 设备名称
  platform: "string",            // 平台类型
  version: "string",              // 版本号
  isOnline: "boolean",            // 是否在线
  lastActiveAt: "Date",           // 最后活跃时间
  lastSyncAt: "Date",             // 最后同步时间
  pendingSyncCount: "number"      // 待同步数量
}
```

## 🔧 配置说明

### 数据库配置 (config/config.default.js)
```javascript
module.exports = () => {
    return {
        port: 3000,
        db: {
            type: "realm",
            path: "./data/handwash.realm",
            // 可选：Atlas App Services 同步配置
            // appId: "your-atlas-app-id",
            // syncEnabled: false
        },
        edge: {
            dataRetentionDays: 30,      // 数据保留天数
            maxStorageSize: "100MB",    // 最大存储大小
            syncInterval: 3600000,      // 同步间隔（毫秒）
            offlineMode: true           // 离线优先模式
        }
    };
};
```

### 前端配置
前端会自动检测环境并选择合适的服务器地址：
- **开发环境**: `http://localhost:3000`
- **生产环境**: 配置的远程服务器地址

## 📱 API 接口

### 用户管理
```bash
# 用户注册
POST /services/user/register
{
  "accountSerialNumber": "user-001",
  "name": "用户名",
  "email": "user@example.com",
  "password": "password123"  // 可选，不提供则为匿名用户
}

# 用户登录
POST /services/user/login
{
  "accountSerialNumber": "user-001",
  "password": "password123"
}

# 获取用户信息
POST /services/user/getUserInfo
{
  "accountSerialNumber": "user-001"
}
```

### 评分管理
```bash
# 提交评分
POST /services/data/rating
{
  "id": "user-001",
  "rating": "PERFECT",
  "step": 7,
  "sessionId": "session-123",
  "detectionAccuracy": 0.95,
  "completionTime": 30.5
}

# 获取用户评分历史
POST /services/data/getUserRatings
{
  "userId": "user-001",
  "limit": 10
}
```

### 排名管理
```bash
# 获取排名列表
POST /services/data/getRankings
{
  "limit": 10
}

# 获取用户排名
POST /services/data/getUserRank
{
  "userId": "user-001"
}

# 获取设备排名
POST /services/data/getDeviceRankings
{
  "limit": 10
}
```

## 🔄 数据同步

### 离线优先架构
1. **本地操作**：所有数据操作首先在本地Realm数据库中完成
2. **后台同步**：有网络时自动同步到云端
3. **冲突解决**：自动处理数据冲突
4. **增量同步**：只同步变更的数据

### 同步配置
```javascript
// 启用Atlas App Services同步（可选）
const config = {
    db: {
        type: "realm",
        path: "./data/handwash.realm",
        appId: "your-atlas-app-id",
        syncEnabled: true
    }
};
```

## 🛠️ 维护和监控

### 数据库统计
```bash
# 获取数据库统计信息
POST /services/data/getStats
```

返回信息包括：
- 用户数量
- 评分记录数
- 性能指标数
- 日志记录数
- 设备数量
- 数据库大小

### 数据清理
系统会自动清理过期数据：
- 日志记录：保留30天
- 性能指标：保留30天
- 用户数据：永久保留
- 评分记录：永久保留

### 手动清理
```bash
# 运行数据清理
node -e "
const RealmService = require('./services/database/realm-service');
const config = require('./config/config.default')();
const service = new RealmService(config);
service.initialize().then(() => service.cleanOldData());
"
```

## 🚨 故障排除

### 常见问题

#### 1. 数据库初始化失败
```bash
# 检查数据目录权限
ls -la data/
chmod 755 data/

# 重新初始化
rm -rf data/handwash.realm*
node scripts/migrate-to-realm.js
```

#### 2. 服务器启动失败
```bash
# 检查端口占用
lsof -i :3000

# 更改端口
export PORT=3001
npm start
```

#### 3. 前端连接失败
```bash
# 检查服务器状态
curl http://localhost:3000

# 检查防火墙设置
sudo ufw allow 3000
```

#### 4. MediaPipe文件加载失败
```bash
# 检查文件是否存在
ls -la new-ai-handwash-APK/public/mediapipe/

# 重新下载MediaPipe文件
cd new-ai-handwash-APK/public/mediapipe
curl -o hands.js https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js
```

## 📈 性能优化

### 边缘设备优化
1. **内存管理**：定期清理过期数据
2. **存储优化**：压缩数据库文件
3. **网络优化**：批量同步数据
4. **CPU优化**：异步处理数据操作

### 监控指标
- 数据库大小
- 内存使用量
- CPU使用率
- 网络延迟
- 同步状态

## 🔐 安全考虑

### 数据安全
- 密码使用bcrypt加密
- 本地数据库文件加密
- API接口访问控制
- 设备身份验证

### 网络安全
- HTTPS传输
- 数据签名验证
- 防重放攻击
- 访问频率限制

## 📞 技术支持

如果您在部署过程中遇到问题，请：

1. 查看日志文件：`data/logs/`
2. 检查系统资源使用情况
3. 验证网络连接状态
4. 联系技术支持团队

---

**部署完成后，您的洗手检测应用将能够在完全离线的环境中运行，为边缘设备提供可靠的本地数据存储和处理能力。** 