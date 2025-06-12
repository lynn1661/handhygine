// view-database.js - 在命令行中查看数据库内容
const { getDb } = require('./sqliteHelper');

async function viewDatabase() {
  console.log('🔍 查看数据库内容...\n');
  
  try {
    const db = await getDb();
    
    // 检查是否有account表（旧版本）
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='account'`);
    if (tables.length > 0) {
      console.log('⚠️ 检测到旧的 account 表，建议运行迁移脚本:');
      console.log('   npm run migrate:simplify-database\n');
    }
    
    // 显示训练会话表
    console.log('📊 训练会话表 (user_info):');
    console.log('=' .repeat(100));
    const sessions = await db.all('SELECT * FROM user_info ORDER BY id DESC');
    if (sessions.length === 0) {
      console.log('暂无训练会话数据\n');
    } else {
      // 表头
      console.log(
        'ID'.padEnd(5) +
        '角色'.padEnd(10) +
        '开始时间'.padEnd(20) +
        '原始分数'.padEnd(10) +
        '映射分数'.padEnd(10) +
        '步骤数'.padEnd(8)
      );
      console.log('-'.repeat(100));
      
      sessions.forEach(session => {
        let stepCount = 0;
        try {
          const stepPoints = JSON.parse(session.step_points || '[]');
          stepCount = stepPoints.length;
        } catch (e) {
          stepCount = 0;
        }
        
        console.log(
          String(session.id).padEnd(5) +
          (session.role || '').padEnd(10) +
          (session.start_time || '').padEnd(20) +
          String(session.total || 0).padEnd(10) +
          String(session.mapped_total || 0).padEnd(10) +
          String(stepCount).padEnd(8)
        );
      });
      
      // 统计信息
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_records,
          AVG(total) as avg_original_score,
          AVG(mapped_total) as avg_mapped_score,
          MAX(total) as max_original_score,
          MAX(mapped_total) as max_mapped_score
        FROM user_info
      `);
      
      console.log('\n📋 统计信息:');
      console.log(`  - 总会话数: ${stats.total_records}`);
      console.log(`  - 平均原始分数: ${stats.avg_original_score?.toFixed(2) || 0}`);
      console.log(`  - 平均映射分数: ${stats.avg_mapped_score?.toFixed(2) || 0}`);
      console.log(`  - 最高原始分数: ${stats.max_original_score || 0}`);
      console.log(`  - 最高映射分数: ${stats.max_mapped_score || 0}`);
    }
    
    // 显示数据库结构
    console.log('\n🏗️ 数据库结构:');
    console.log('=' .repeat(80));
    
    const userInfoSchema = await db.all(`PRAGMA table_info(user_info)`);
    console.log('user_info 表字段（训练会话）:');
    userInfoSchema.forEach(col => {
      console.log(`  - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
    });

    // 显示所有表
    const allTables = await db.all(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log('\n📋 数据库中的所有表:');
    allTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
  } catch (error) {
    console.error('❌ 查看数据库时出错:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  viewDatabase()
    .then(() => {
      console.log('\n✅ 数据库查看完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { viewDatabase }; 