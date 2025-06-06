// test-sqlite.js - 测试 SQLite 数据库功能
const { getDb } = require('./sqliteHelper');

async function testDatabase() {
  console.log('🔍 开始测试 SQLite 数据库...');
  
  try {
    // 1. 获取数据库连接
    console.log('📦 正在初始化数据库连接...');
    const db = await getDb();
    console.log('✅ 数据库连接成功');
    
    // 2. 检查表是否存在
    console.log('🔍 检查数据库表结构...');
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    console.log('📋 已创建的表:', tables.map(t => t.name));
    
    // 3. 测试插入账户数据
    console.log('➕ 测试插入账户数据...');
    const testAccountID = 'test_' + Date.now();
    const testPassword = 'test_password_hash';
    
    await db.run(`
      INSERT INTO account (accountID, password) 
      VALUES (?, ?)
    `, [testAccountID, testPassword]);
    console.log('✅ 账户数据插入成功');
    
    // 4. 测试查询账户数据
    console.log('🔍 测试查询账户数据...');
    const account = await db.get(`
      SELECT * FROM account WHERE accountID = ?
    `, [testAccountID]);
    console.log('📄 查询到的账户:', account);
    
    // 5. 测试插入用户信息数据
    console.log('➕ 测试插入用户信息数据...');
    const userInfo = {
      accountID: testAccountID,
      userID: 'user_123',
      role: 'student',
      start_time: new Date().toLocaleString('zh-CN'),
      step_correctness: JSON.stringify([true, false, true]),
      step_points: JSON.stringify([8.5, 7.2, 9.1]),
      total: 24.8,
      record_time: JSON.stringify([{
        timestamp: Date.now(),
        datestring: new Date().toISOString()
      }])
    };
    
    await db.run(`
      INSERT INTO user_info (
        accountID, userID, role, start_time,
        step_correctness, step_points, total, record_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userInfo.accountID, userInfo.userID, userInfo.role, userInfo.start_time,
      userInfo.step_correctness, userInfo.step_points,
      userInfo.total, userInfo.record_time
    ]);
    console.log('✅ 用户信息数据插入成功');
    
    // 6. 测试查询用户信息数据
    console.log('🔍 测试查询用户信息数据...');
    const userInfoResult = await db.get(`
      SELECT * FROM user_info WHERE accountID = ?
    `, [testAccountID]);
    console.log('📄 查询到的用户信息:', userInfoResult);
    
    // 7. 测试联表查询
    console.log('🔍 测试联表查询...');
    const joinResult = await db.all(`
      SELECT a.accountID, a.password, u.userID, u.role, u.total
      FROM account a
      LEFT JOIN user_info u ON a.accountID = u.accountID
      WHERE a.accountID = ?
    `, [testAccountID]);
    console.log('📄 联表查询结果:', joinResult);
    
    // 8. 测试统计查询
    console.log('🔍 测试统计查询...');
    const stats = await db.all(`
      SELECT 
        COUNT(*) as total_users,
        AVG(total) as avg_score,
        MAX(total) as max_score,
        MIN(total) as min_score
      FROM user_info
    `);
    console.log('📊 统计信息:', stats[0]);
    
    // 9. 清理测试数据
    console.log('🧹 清理测试数据...');
    await db.run('DELETE FROM user_info WHERE accountID = ?', [testAccountID]);
    await db.run('DELETE FROM account WHERE accountID = ?', [testAccountID]);
    console.log('✅ 测试数据清理完成');
    
    console.log('🎉 SQLite 数据库测试全部通过！');
    console.log('📝 数据库功能验证结果:');
    console.log('  ✅ 数据库连接正常');
    console.log('  ✅ 表结构创建正常');
    console.log('  ✅ 数据插入正常');
    console.log('  ✅ 数据查询正常');
    console.log('  ✅ 联表查询正常');
    console.log('  ✅ 统计查询正常');
    console.log('  ✅ 数据清理正常');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testDatabase().then(() => {
  console.log('📋 测试完成，可以安全关闭');
  process.exit(0);
}); 