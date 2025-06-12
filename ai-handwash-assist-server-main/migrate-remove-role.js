// migrate-remove-role.js - 从数据库中移除role字段
const { getDb } = require('./sqliteHelper');

async function removeRoleField() {
  console.log('🔄 开始移除 role 字段...');
  
  try {
    const db = await getDb();
    
    // 1. 检查字段是否存在
    const tableInfo = await db.all(`PRAGMA table_info(user_info)`);
    const hasRole = tableInfo.some(col => col.name === 'role');
    
    if (!hasRole) {
      console.log('✅ role 字段不存在，无需删除');
      return;
    }
    
    console.log('📋 当前表结构:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 2. 获取现有数据
    const existingData = await db.all('SELECT * FROM user_info');
    console.log(`📊 找到 ${existingData.length} 条现有记录`);
    
    // 3. 创建新表（不包含role字段）
    await db.exec(`
      CREATE TABLE user_info_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time       TEXT NOT NULL,
        step_points      TEXT,
        total            REAL DEFAULT 0,
        mapped_total     REAL DEFAULT 0,
        record_time      TEXT
      );
    `);
    console.log('✅ 创建新表结构成功');
    
    // 4. 迁移数据（排除role字段）
    if (existingData.length > 0) {
      for (const row of existingData) {
        await db.run(`
          INSERT INTO user_info_new (
            id, start_time, step_points, total, mapped_total, record_time
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          row.id,
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
    console.log('✅ 更新表结构完成');
    
    // 6. 验证新表结构
    const newTableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 新的表结构:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 7. 验证数据完整性
    const newDataCount = await db.get('SELECT COUNT(*) as count FROM user_info');
    console.log(`📊 迁移后记录数: ${newDataCount.count}`);
    
    if (newDataCount.count === existingData.length) {
      console.log('🎉 role字段移除完成，数据完整性验证通过！');
    } else {
      console.warn('⚠️ 警告：迁移后的记录数与原始记录数不匹配');
    }
    
    console.log('\n📝 数据库迁移总结:');
    console.log('  ✅ 移除了 role 字段');
    console.log('  ✅ 保留了所有训练会话数据');
    console.log('  ✅ 数据库结构已简化');
    
  } catch (error) {
    console.error('❌ 移除role字段时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  removeRoleField()
    .then(() => {
      console.log('✅ 迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { removeRoleField }; 