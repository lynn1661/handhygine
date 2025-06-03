// test-frontend-compatibility.js - 测试前端请求格式兼容性
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 模拟前端axios拦截器的请求格式
const mockFrontendRequest = (url, data) => {
  return axios.post(`${BASE_URL}${url}`, {
    data: { ...data }  // 前端会包装数据到data字段
  });
};

async function testFrontendCompatibility() {
  console.log('🧪 测试前端请求格式兼容性...');
  console.log('');

  try {
    // 1. 测试用户登录 - 模拟前端调用
    console.log('1️⃣ 测试前端登录请求格式...');
    const loginResponse = await mockFrontendRequest('/user/info/login', {
      accountID: 'testuser123',
      password: 'password123'
    });
    console.log('✅ 前端登录格式兼容:', loginResponse.data);
    console.log('');

    // 2. 测试填写用户信息 - 模拟前端调用
    console.log('2️⃣ 测试前端填写用户信息请求格式...');
    const fillResponse = await mockFrontendRequest('/user/info/fill', {
      accountID: 'testuser123',
      userID: 'frontend_user_001',
      role: 'student'
    });
    console.log('✅ 前端填写用户信息格式兼容:', fillResponse.data);
    const userId = fillResponse.data.data.ID;
    console.log('');

    // 3. 测试添加评分记录 - 模拟前端调用
    console.log('3️⃣ 测试前端添加评分记录请求格式...');
    const ratingResponse = await mockFrontendRequest('/data/record/append_rating', {
      id: userId,
      step_video_file: 'frontend_test_video.mp4',
      rating: 88,
      points: 45.5
    });
    console.log('✅ 前端评分记录格式兼容:', ratingResponse.data);
    console.log('');

    // 4. 测试获取排名 - 模拟前端调用
    console.log('4️⃣ 测试前端获取排名请求格式...');
    const rankResponse = await mockFrontendRequest('/data/record/get_rank', {
      id: userId
    });
    console.log('✅ 前端获取排名格式兼容:', rankResponse.data);
    console.log('');

    // 5. 测试提交评分 - 模拟前端调用
    console.log('5️⃣ 测试前端提交评分请求格式...');
    const submitRatingResponse = await mockFrontendRequest('/data/rate/rating', {
      id: userId,
      rating: {
        ui: 5,
        training: 4,
        recommend: 5
      }
    });
    console.log('✅ 前端提交评分格式兼容:', submitRatingResponse.data);
    console.log('');

    // 6. 测试获取排行列表 - 模拟前端调用
    console.log('6️⃣ 测试前端获取排行列表请求格式...');
    const rankListResponse = await mockFrontendRequest('/data/rank/getRankList', {
      accountID: 'testuser123',
      role: 'student'
    });
    console.log('✅ 前端排行列表格式兼容:', rankListResponse.data);
    console.log('');

    // 7. 测试获取所有排名 - 模拟前端调用
    console.log('7️⃣ 测试前端获取所有排名请求格式...');
    const allRankResponse = await mockFrontendRequest('/data/rank/getAllRank', {
      accountID: 'testuser123'
    });
    console.log('✅ 前端所有排名格式兼容:', allRankResponse.data);
    console.log('');

    // 8. 测试获取评分统计 - 模拟前端调用
    console.log('8️⃣ 测试前端获取评分统计请求格式...');
    const getRatingsResponse = await mockFrontendRequest('/data/rate/get_ratings', {});
    console.log('✅ 前端评分统计格式兼容:', getRatingsResponse.data);
    console.log('');

    console.log('🎉 前端兼容性测试完成！');
    console.log('📋 测试结果汇总:');
    console.log('  ✅ 用户登录 - 兼容');
    console.log('  ✅ 填写用户信息 - 兼容');
    console.log('  ✅ 添加评分记录 - 兼容');
    console.log('  ✅ 获取排名 - 兼容');
    console.log('  ✅ 提交评分 - 兼容');
    console.log('  ✅ 获取排行列表 - 兼容');
    console.log('  ✅ 获取所有排名 - 兼容');
    console.log('  ✅ 获取评分统计 - 兼容');
    console.log('');
    console.log('🏆 前端代码完全兼容SQLite后端服务器！');

  } catch (error) {
    console.error('❌ 兼容性测试失败:', error.response?.data || error.message);
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
    console.log('✅ SQLite服务器正在运行，开始兼容性测试...');
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ SQLite服务器未运行，请先启动服务器: npm start');
    return false;
  }
}

// 运行测试
checkServer().then(serverRunning => {
  if (serverRunning) {
    testFrontendCompatibility();
  }
}); 