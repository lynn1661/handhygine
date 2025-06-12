// migrate-simplify-database.js - 简化数据库结构，删除账户系统
const { getDb } = require('./sqliteHelper');

async function simplifyDatabase() {
  console.log('🔄 开始简化数据库结构...');
  
  try {
    const db = await getDb();
    
    // 1. 检查当前表结构
    const tableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 当前 user_info 表结构:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    const hasAccountID = tableInfo.some(col => col.name === 'accountID');
    const hasUserID = tableInfo.some(col => col.name === 'userID');
    const hasStepCorrectness = tableInfo.some(col => col.name === 'step_correctness');
    
    // 2. 检查是否有account表
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='account'`);
    const hasAccountTable = tables.length > 0;
    
    if (!hasAccountID && !hasUserID && !hasStepCorrectness && !hasAccountTable) {
      console.log('✅ 数据库已经是简化版本，无需迁移');
      return;
    }
    
    // 3. 备份现有数据
    const existingData = await db.all('SELECT * FROM user_info');
    console.log(`📊 找到 ${existingData.length} 条现有记录`);
    
    // 4. 创建新的简化表结构
    await db.exec(`
      CREATE TABLE user_info_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        role             TEXT NOT NULL,
        start_time       TEXT NOT NULL,
        step_points      TEXT,
        total            REAL DEFAULT 0,
        mapped_total     REAL DEFAULT 0,
        record_time      TEXT
      );
    `);
    console.log('✅ 创建新的简化表结构');
    
    // 5. 迁移数据（只保留需要的字段）
    if (existingData.length > 0) {
      for (const row of existingData) {
        await db.run(`
          INSERT INTO user_info_new (
            id, role, start_time, step_points, total, mapped_total, record_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id,
          row.role,
          row.start_time,
          row.step_points,
          row.total,
          row.mapped_total || 0,
          row.record_time
        ]);
      }
      console.log(`✅ 成功迁移 ${existingData.length} 条记录`);
    }
    
    // 6. 删除旧表，重命名新表
    await db.exec('DROP TABLE user_info');
    await db.exec('ALTER TABLE user_info_new RENAME TO user_info');
    console.log('✅ 更新表结构完成');
    
    // 7. 删除account表（如果存在）
    if (hasAccountTable) {
      await db.exec('DROP TABLE account');
      console.log('✅ 删除 account 表');
    }
    
    // 8. 验证新表结构
    const newTableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 新的表结构:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 9. 验证数据完整性
    const newDataCount = await db.get('SELECT COUNT(*) as count FROM user_info');
    console.log(`📊 迁移后记录数: ${newDataCount.count}`);
    
    // 10. 显示所有表
    const allTables = await db.all(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log('📋 数据库中的表:');
    allTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    if (newDataCount.count === existingData.length) {
      console.log('🎉 数据库简化完成，数据完整性验证通过！');
    } else {
      console.warn('⚠️ 警告：迁移后的记录数与原始记录数不匹配');
    }
    
    console.log('\n📝 数据库简化总结:');
    if (hasAccountTable) console.log('  ✅ 删除了 account 表');
    if (hasAccountID) console.log('  ✅ 删除了 accountID 字段');
    if (hasUserID) console.log('  ✅ 删除了 userID 字段');
    if (hasStepCorrectness) console.log('  ✅ 删除了 step_correctness 字段');
    console.log('  ✅ 系统已简化为匿名训练模式');
    
  } catch (error) {
    console.error('❌ 简化数据库时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  simplifyDatabase()
    .then(() => {
      console.log('✅ 数据库简化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { simplifyDatabase }; 