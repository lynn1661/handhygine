// migrate-remove-step-correctness.js - 删除数据库中的step_correctness字段
const { getDb } = require('./sqliteHelper');

async function removeStepCorrectnessColumn() {
  console.log('🔄 开始删除 step_correctness 字段...');
  
  try {
    const db = await getDb();
    
    // 1. 检查字段是否存在
    const tableInfo = await db.all(`PRAGMA table_info(user_info)`);
    const hasStepCorrectness = tableInfo.some(col => col.name === 'step_correctness');
    
    if (!hasStepCorrectness) {
      console.log('✅ step_correctness 字段不存在，无需删除');
      return;
    }
    
    console.log('📋 当前表结构:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 2. 获取现有数据
    const existingData = await db.all('SELECT * FROM user_info');
    console.log(`📊 找到 ${existingData.length} 条现有记录`);
    
    // 3. 创建新表（不包含step_correctness字段）
    await db.exec(`
      CREATE TABLE user_info_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        accountID        TEXT NOT NULL,
        userID           TEXT NOT NULL,
        role             TEXT NOT NULL,
        start_time       TEXT NOT NULL,
        step_points      TEXT,
        total            REAL DEFAULT 0,
        mapped_total     REAL DEFAULT 0,
        record_time      TEXT
      );
    `);
    console.log('✅ 创建新表结构成功');
    
    // 4. 将数据迁移到新表（排除step_correctness字段）
    if (existingData.length > 0) {
      for (const row of existingData) {
        await db.run(`
          INSERT INTO user_info_new (
            id, accountID, userID, role, start_time, 
            step_points, total, mapped_total, record_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id,
          row.accountID,
          row.userID,
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
    
    // 5. 删除旧表，重命名新表
    await db.exec('DROP TABLE user_info');
    await db.exec('ALTER TABLE user_info_new RENAME TO user_info');
    console.log('✅ 表重命名成功');
    
    // 6. 验证新表结构
    const newTableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 新表结构:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 7. 验证数据完整性
    const newDataCount = await db.get('SELECT COUNT(*) as count FROM user_info');
    console.log(`📊 迁移后记录数: ${newDataCount.count}`);
    
    if (newDataCount.count === existingData.length) {
      console.log('🎉 数据迁移完成，记录数匹配！');
    } else {
      console.warn('⚠️ 警告：迁移后的记录数与原始记录数不匹配');
    }
    
  } catch (error) {
    console.error('❌ 删除 step_correctness 字段时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  removeStepCorrectnessColumn()
    .then(() => {
      console.log('✅ step_correctness 字段删除完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { removeStepCorrectnessColumn }; 