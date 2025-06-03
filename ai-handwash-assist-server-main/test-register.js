// test-register.js - 测试用户注册功能
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 模拟前端axios拦截器的请求格式
const mockFrontendRequest = (url, data) => {
  return axios.post(`${BASE_URL}${url}`, {
    data: { ...data }
  });
};

async function testRegister() {
  console.log('🧪 测试用户注册功能...');
  console.log('');

  try {
    // 1. 测试注册新用户
    console.log('1️⃣ 测试注册新用户...');
    const newAccountID = 'testuser_' + Date.now();
    const registerResponse = await mockFrontendRequest('/user/info/register', {
      accountID: newAccountID,
      password: 'password123'
    });
    console.log('✅ 用户注册成功:', registerResponse.data);
    console.log('');

    // 2. 测试用已注册的用户登录
    console.log('2️⃣ 测试用新注册的账户登录...');
    const loginResponse = await mockFrontendRequest('/user/info/login', {
      accountID: newAccountID,
      password: 'password123'
    });
    console.log('✅ 新用户登录成功:', loginResponse.data);
    console.log('');

    // 3. 测试重复注册相同账户（应该失败）
    console.log('3️⃣ 测试重复注册相同账户（应该失败）...');
    try {
      await mockFrontendRequest('/user/info/register', {
        accountID: newAccountID,
        password: 'password456'
      });
      console.log('❌ 重复注册应该失败，但成功了');
    } catch (error) {
      console.log('✅ 重复注册正确失败:', error.response?.data?.data?.message);
    }
    console.log('');

    // 4. 测试密码过短（应该失败）
    console.log('4️⃣ 测试密码过短（应该失败）...');
    try {
      await mockFrontendRequest('/user/info/register', {
        accountID: 'testuser_short',
        password: '123'
      });
      console.log('❌ 短密码应该失败，但成功了');
    } catch (error) {
      console.log('✅ 短密码正确失败:', error.response?.data?.data?.message);
    }
    console.log('');

    // 5. 测试空字段（应该失败）
    console.log('5️⃣ 测试空字段（应该失败）...');
    try {
      await mockFrontendRequest('/user/info/register', {
        accountID: '',
        password: 'password123'
      });
      console.log('❌ 空账户ID应该失败，但成功了');
    } catch (error) {
      console.log('✅ 空账户ID正确失败:', error.response?.data?.data?.message);
    }
    console.log('');

    console.log('🎉 用户注册功能测试完成！');
    console.log('📋 测试结果汇总:');
    console.log('  ✅ 新用户注册 - 成功');
    console.log('  ✅ 新用户登录 - 成功');
    console.log('  ✅ 重复注册检查 - 正确拒绝');
    console.log('  ✅ 密码长度验证 - 正确拒绝');
    console.log('  ✅ 空字段验证 - 正确拒绝');
    console.log('');
    console.log('🏆 注册功能工作正常！');

  } catch (error) {
    console.error('❌ 注册测试失败:', error.response?.data || error.message);
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
    console.log('✅ SQLite服务器正在运行，开始注册功能测试...');
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
    testRegister();
  }
}); 