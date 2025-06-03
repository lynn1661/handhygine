# Hand Hygiene Assist Server

基于 SQLite 数据库的手部卫生辅助服务器，使用 Express.js 框架构建。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动服务器
```bash
npm start
```

服务器将在 `http://localhost:3001` 启动。

## 📋 可用脚本

- `npm start` - 启动服务器
- `npm run dev` - 开发模式启动服务器
- `npm test` - 运行 SQLite 数据库测试
- `npm run test:api` - 运行完整的 API 测试
- `npm run create:account` - 创建测试账户

## 🗄️ 数据库

使用 SQLite 数据库 (`./data.db`)，包含以下表：

### account 表
- `accountID` (TEXT, PRIMARY KEY) - 账户ID
- `password` (TEXT) - bcrypt 哈希密码

### user_info 表
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT) - 自增ID
- `accountID` (TEXT) - 账户ID（外键）
- `userID` (TEXT) - 用户ID
- `role` (TEXT) - 用户角色
- `start_time` (TEXT) - 开始时间
- `step_video_file` (TEXT) - 步骤视频文件（JSON数组）
- `step_correctness` (TEXT) - 步骤正确性（JSON数组）
- `step_points` (TEXT) - 步骤得分（JSON数组）
- `total` (REAL) - 总分
- `record_time` (TEXT) - 记录时间（JSON数组）
- `rating` (TEXT) - 评分（JSON对象）

## 🔌 API 端点

### 基础端点
- `GET /` - 服务器信息
- `GET /health` - 健康检查

### 用户相关
- `POST /user/info/login` - 用户登录
- `POST /user/info/fill` - 填写用户信息
- `POST /user/hash` - 密码哈希

### 数据相关
- `POST /data/record/append_rating` - 添加评分记录
- `POST /data/record/get_rank` - 获取用户排名
- `POST /data/rate/rating` - 提交评分
- `POST /data/rate/get_ratings` - 获取评分统计
- `POST /data/rank/getRankList` - 获取排行列表
- `POST /data/rank/getAllRank` - 获取所有排名

## 📝 API 使用示例

### 用户登录
```bash
curl -X POST http://localhost:3001/user/info/login \
  -H "Content-Type: application/json" \
  -d '{"accountID":"testuser123","password":"password123"}'
```

### 填写用户信息
```bash
curl -X POST http://localhost:3001/user/info/fill \
  -H "Content-Type: application/json" \
  -d '{"accountID":"testuser123","userID":"user001","role":"student"}'
```

### 添加评分记录
```bash
curl -X POST http://localhost:3001/data/record/append_rating \
  -H "Content-Type: application/json" \
  -d '{"id":1,"step_video_file":"video.mp4","rating":85,"points":42.5}'
```

## 🧪 测试

### 创建测试账户
```bash
npm run create:account
```

这将创建一个测试账户：
- 账户ID: `testuser123`
- 密码: `password123`

### 运行数据库测试
```bash
npm test
```

### 运行完整API测试
```bash
npm run test:api
```

## 📊 响应格式

所有API响应都使用统一格式：

```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

错误响应：
```json
{
  "success": false,
  "data": {
    "message": "错误信息"
  }
}
```

## 🔧 技术栈

- **框架**: Express.js
- **数据库**: SQLite
- **密码加密**: bcrypt
- **跨域**: CORS
- **HTTP客户端**: axios (测试用)

## 📁 项目结构

```
ai-handwash-assist-server-main/
├── server.js              # 主服务器文件
├── sqliteHelper.js        # SQLite 数据库助手
├── package.json           # 项目配置
├── README.md             # 项目文档
├── data.db               # SQLite 数据库文件
├── test-sqlite.js        # 数据库测试
├── test-api.js           # API 测试
├── create-test-account.js # 创建测试账户
└── services/             # 服务模块
    ├── user/
    │   ├── info.js       # 用户信息服务
    │   └── hash.js       # 密码哈希服务
    └── data/
        ├── record.js     # 记录服务
        ├── rate.js       # 评分服务
        └── rank.js       # 排名服务
```

## 🔒 安全注意事项

1. 密码使用 bcrypt 进行哈希加密
2. 生产环境中应移除测试账户
3. 建议使用环境变量配置敏感信息
4. 考虑添加 JWT 认证机制

## 🚀 部署

1. 确保 Node.js 环境
2. 安装依赖: `npm install`
3. 启动服务: `npm start`
4. 服务器将在指定端口运行

## 📞 支持

如有问题，请检查：
1. Node.js 版本兼容性
2. 依赖包是否正确安装
3. 数据库文件权限
4. 端口是否被占用
