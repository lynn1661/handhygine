// migrate-remove-role.js - 删除role字段并清理数据库
const { getDb } = require('./sqliteHelper');

async function removeRoleField() {
  console.log('🔄 开始删除role字段并清理数据库...');
  
  try {
    const db = await getDb();
    
    // 1. 检查当前表结构
    const tableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 当前 user_info 表结构:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    const hasRole = tableInfo.some(col => col.name === 'role');
    
    if (!hasRole) {
      console.log('✅ role字段不存在，无需删除');
      return;
    }
    
    // 2. 显示当前数据
    const existingData = await db.all('SELECT * FROM user_info');
    console.log(`📊 找到 ${existingData.length} 条现有记录`);
    
    // 3. 询问是否要保留现有数据
    console.log('⚠️ 将要删除role字段，这需要重建表结构');
    console.log('📝 选项:');
    console.log('   1. 保留现有数据（推荐用于生产环境）');
    console.log('   2. 清空所有数据，重新开始（推荐用于开发测试）');
    
    // 对于这个脚本，我们选择清空数据重新开始，因为这是开发环境
    const clearData = true;
    
    if (clearData) {
      console.log('🗑️ 选择清空所有数据，重新开始...');
      
      // 删除旧表
      await db.exec('DROP TABLE IF EXISTS user_info');
      console.log('✅ 删除旧表成功');
      
      // 创建新的表结构（不包含role字段）
      await db.exec(`
        CREATE TABLE user_info (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time       TEXT NOT NULL,
          step_points      TEXT,
          total            REAL DEFAULT 0,
          mapped_total     REAL DEFAULT 0,
          record_time      TEXT
        );
      `);
      console.log('✅ 创建新表结构成功（不包含role字段）');
      
    } else {
      // 保留数据的迁移逻辑
      console.log('📦 保留现有数据进行迁移...');
      
      // 创建新表（不包含role字段）
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
      console.log('✅ 创建新表结构');
      
      // 迁移数据（排除role字段）
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
      
      // 删除旧表，重命名新表
      await db.exec('DROP TABLE user_info');
      await db.exec('ALTER TABLE user_info_new RENAME TO user_info');
      console.log('✅ 更新表结构完成');
    }
    
    // 4. 验证新表结构
    const newTableInfo = await db.all(`PRAGMA table_info(user_info)`);
    console.log('📋 新的表结构:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 5. 验证数据
    const newDataCount = await db.get('SELECT COUNT(*) as count FROM user_info');
    console.log(`📊 迁移后记录数: ${newDataCount.count}`);
    
    console.log('🎉 role字段删除完成！');
    console.log('\n📝 迁移总结:');
    console.log('  ✅ 删除了role字段');
    console.log('  ✅ 简化了表结构');
    console.log('  ✅ 数据库已准备好用于新的无角色系统');
    
  } catch (error) {
    console.error('❌ 迁移过程中出错:', error);
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