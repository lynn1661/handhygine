// create-test-account.js - 创建测试账户并测试API
const bcrypt = require('bcrypt');
const { getDb } = require('./sqliteHelper');

async function createTestAccount() {
  console.log('🔧 创建测试账户...');
  
  try {
    const db = await getDb();
    
    // 创建测试账户
    const testAccountID = 'testuser123';
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // 先删除可能存在的测试账户
    await db.run('DELETE FROM user_info WHERE accountID = ?', [testAccountID]);
    await db.run('DELETE FROM account WHERE accountID = ?', [testAccountID]);
    
    // 插入新的测试账户
    await db.run(
      'INSERT INTO account (accountID, password) VALUES (?, ?)',
      [testAccountID, hashedPassword]
    );
    
    console.log('✅ 测试账户创建成功');
    console.log('📋 账户信息:');
    console.log('  - 账户ID:', testAccountID);
    console.log('  - 密码:', testPassword);
    console.log('  - 哈希密码:', hashedPassword);
    
    // 验证账户是否创建成功
    const account = await db.get(
      'SELECT * FROM account WHERE accountID = ?',
      [testAccountID]
    );
    
    if (account) {
      console.log('✅ 账户验证成功');
      console.log('🧪 现在可以使用以下方式测试API:');
      console.log('');
      console.log('1. 测试登录API:');
      console.log(`curl -X POST http://localhost:3001/user/info/login \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"accountID":"${testAccountID}","password":"${testPassword}"}'`);
      console.log('');
      console.log('2. 测试填写用户信息API:');
      console.log(`curl -X POST http://localhost:3001/user/info/fill \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"accountID":"${testAccountID}","userID":"user001","role":"student"}'`);
    } else {
      console.log('❌ 账户验证失败');
    }
    
  } catch (error) {
    console.error('❌ 创建测试账户失败:', error);
  }
}

createTestAccount(); 