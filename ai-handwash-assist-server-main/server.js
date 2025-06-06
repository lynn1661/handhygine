const express = require('express');
const cors = require('cors');

// 导入所有服务模块
const userInfo = require('./services/user/info');
const userHash = require('./services/user/hash');
const dataRecord = require('./services/data/record');
const dataRank = require('./services/data/rank');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 错误处理中间件
const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 统一响应格式
const sendResponse = (res, success, data, statusCode = 200) => {
  res.status(statusCode).json({
    success,
    data
  });
};

// 数据提取中间件 - 处理前端的数据格式
const extractData = (req, res, next) => {
  // 前端axios拦截器会将数据包装为 {data: {...}}
  if (req.body && req.body.data) {
    req.body = req.body.data;
  }
  next();
};

// 根路径
app.get('/', (req, res) => {
  sendResponse(res, true, { 
    message: 'Hand Hygiene Assist Server', 
    version: '1.0.0',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  sendResponse(res, true, { message: 'Server is running with SQLite database', timestamp: new Date().toISOString() });
});

// 用户相关API路由 - 添加数据提取中间件
app.post('/user/info/login', extractData, handleAsync(async (req, res) => {
  const result = await userInfo.login({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/user/info/register', extractData, handleAsync(async (req, res) => {
  const result = await userInfo.register({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/user/info/fill', extractData, handleAsync(async (req, res) => {
  const result = await userInfo.fill({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/user/hash', extractData, handleAsync(async (req, res) => {
  const result = await userHash.hash({ data: req.body });
  sendResponse(res, true, result);
}));

// 数据相关API路由 - 添加数据提取中间件
app.post('/data/record/append_rating', extractData, handleAsync(async (req, res) => {
  const result = await dataRecord.append_rating({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/data/record/get_rank', extractData, handleAsync(async (req, res) => {
  const result = await dataRecord.get_rank({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/data/rank/getRankList', extractData, handleAsync(async (req, res) => {
  const result = await dataRank.getRankList({ data: req.body });
  sendResponse(res, true, result);
}));

app.post('/data/rank/getAllRank', extractData, handleAsync(async (req, res) => {
  const result = await dataRank.getAllRank({ data: req.body });
  sendResponse(res, true, result);
}));

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  
  const statusCode = error.code || 500;
  const message = error.message || 'Internal Server Error';
  
  sendResponse(res, false, { message }, statusCode);
});

// 404 处理 - 必须放在最后
app.use((req, res) => {
  sendResponse(res, false, { message: 'Endpoint not found' }, 404);
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 Hand Hygiene Assist Server Started');
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌐 Access URL: http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (./data.db)`);
  console.log(`⚡ Framework: Express.js`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health - 健康检查');
  console.log('  POST /user/info/login - 用户登录');
  console.log('  POST /user/info/register - 用户注册');
  console.log('  POST /user/info/fill - 填写用户信息');
  console.log('  POST /user/hash - 密码哈希');
  console.log('  POST /data/record/append_rating - 添加评分记录');
  console.log('  POST /data/record/get_rank - 获取用户排名');
  console.log('  POST /data/rank/getRankList - 获取排行列表');
  console.log('  POST /data/rank/getAllRank - 获取所有排名');
  console.log('  🔧 支持前端数据格式兼容');
  console.log('');
});


