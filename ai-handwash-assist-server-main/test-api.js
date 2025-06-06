// test-api.js - 完整的API测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 开始测试所有API端点...');
  console.log('');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查通过:', healthResponse.data);
    console.log('');

    // 2. 测试密码哈希
    console.log('2️⃣ 测试密码哈希...');
    const hashResponse = await axios.post(`${BASE_URL}/user/hash`, {
      password: 'newpassword123'
    });
    console.log('✅ 密码哈希成功:', hashResponse.data);
    console.log('');

    // 3. 测试用户登录
    console.log('3️⃣ 测试用户登录...');
    const loginResponse = await axios.post(`${BASE_URL}/user/info/login`, {
      accountID: 'testuser123',
      password: 'password123'
    });
    console.log('✅ 登录成功:', loginResponse.data);
    console.log('');

    // 4. 测试填写用户信息
    console.log('4️⃣ 测试填写新用户信息...');
    const fillResponse = await axios.post(`${BASE_URL}/user/info/fill`, {
      accountID: 'testuser123',
      userID: 'user002',
      role: 'teacher'
    });
    console.log('✅ 用户信息填写成功:', fillResponse.data);
    const newUserId = fillResponse.data.data.ID;
    console.log('');

    // 5. 测试添加评分记录
    console.log('5️⃣ 测试添加评分记录...');
    const appendRatingResponse = await axios.post(`${BASE_URL}/data/record/append_rating`, {
      id: newUserId,
      rating: 85,
      points: 42.5
    });
    console.log('✅ 评分记录添加成功:', appendRatingResponse.data);
    console.log('');

    // 6. 测试获取用户排名
    console.log('6️⃣ 测试获取用户排名...');
    const getRankResponse = await axios.post(`${BASE_URL}/data/record/get_rank`, {
      id: newUserId
    });
    console.log('✅ 获取排名成功:', getRankResponse.data);
    console.log('');

    // 7. 测试获取排行列表
    console.log('7️⃣ 测试获取排行列表...');
    const getRankListResponse = await axios.post(`${BASE_URL}/data/rank/getRankList`, {
      accountID: 'testuser123',
      role: 'teacher'
    });
    console.log('✅ 排行列表获取成功:', getRankListResponse.data);
    console.log('');

    // 8. 测试获取所有排名
    console.log('8️⃣ 测试获取所有排名...');
    const getAllRankResponse = await axios.post(`${BASE_URL}/data/rank/getAllRank`, {
      accountID: 'testuser123'
    });
    console.log('✅ 所有排名获取成功:', getAllRankResponse.data);
    console.log('');

    console.log('🎉 所有API测试完成！');
    console.log('📋 测试结果汇总:');
    console.log('  ✅ 健康检查 - 通过');
    console.log('  ✅ 密码哈希 - 通过');
    console.log('  ✅ 用户登录 - 通过');
    console.log('  ✅ 用户信息填写 - 通过');
    console.log('  ✅ 评分记录添加 - 通过');
    console.log('  ✅ 用户排名获取 - 通过');
    console.log('  ✅ 排行列表获取 - 通过');
    console.log('  ✅ 所有排名获取 - 通过');
    console.log('');
    console.log('🏆 所有功能正常运行！SQLite数据库工作正常！');

  } catch (error) {
    console.error('❌ API测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务器正在运行，开始测试...');
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ 服务器未运行，请先启动服务器: npm start');
    return false;
  }
}

// 运行测试
checkServer().then(serverRunning => {
  if (serverRunning) {
    testAPI();
  }
}); 