// view-database.js - 在命令行中查看数据库内容
const { getDb } = require('./sqliteHelper');

async function viewDatabase() {
  console.log('🔍 查看数据库内容...\n');
  
  try {
    const db = await getDb();
    
    // 显示账户表
    console.log('👥 账户表 (account):');
    console.log('=' .repeat(80));
    const accounts = await db.all('SELECT * FROM account');
    if (accounts.length === 0) {
      console.log('暂无账户数据\n');
    } else {
      console.log('账户ID'.padEnd(20) + '密码哈希值'.padEnd(50));
      console.log('-'.repeat(80));
      accounts.forEach(account => {
        console.log(
          account.accountID.padEnd(20) + 
          (account.password.substring(0, 40) + '...').padEnd(50)
        );
      });
      console.log(`\n总计: ${accounts.length} 个账户\n`);
    }
    
    // 显示用户信息表
    console.log('📊 用户信息表 (user_info):');
    console.log('=' .repeat(120));
    const userInfos = await db.all('SELECT * FROM user_info ORDER BY id DESC');
    if (userInfos.length === 0) {
      console.log('暂无用户信息数据\n');
    } else {
      // 表头
      console.log(
        'ID'.padEnd(5) +
        '账户ID'.padEnd(15) +
        '用户ID'.padEnd(15) +
        '角色'.padEnd(10) +
        '开始时间'.padEnd(20) +
        '原始分数'.padEnd(10) +
        '映射分数'.padEnd(10) +
        '步骤数'.padEnd(8)
      );
      console.log('-'.repeat(120));
      
      userInfos.forEach(user => {
        let stepCount = 0;
        try {
          const stepPoints = JSON.parse(user.step_points || '[]');
          stepCount = stepPoints.length;
        } catch (e) {
          stepCount = 0;
        }
        
        console.log(
          String(user.id).padEnd(5) +
          (user.accountID || '').padEnd(15) +
          (user.userID || '').padEnd(15) +
          (user.role || '').padEnd(10) +
          (user.start_time || '').padEnd(20) +
          String(user.total || 0).padEnd(10) +
          String(user.mapped_total || 0).padEnd(10) +
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
      console.log(`  - 总记录数: ${stats.total_records}`);
      console.log(`  - 平均原始分数: ${stats.avg_original_score?.toFixed(2) || 0}`);
      console.log(`  - 平均映射分数: ${stats.avg_mapped_score?.toFixed(2) || 0}`);
      console.log(`  - 最高原始分数: ${stats.max_original_score || 0}`);
      console.log(`  - 最高映射分数: ${stats.max_mapped_score || 0}`);
    }
    
    // 显示数据库结构
    console.log('\n🏗️ 数据库结构:');
    console.log('=' .repeat(80));
    
    const accountSchema = await db.all(`PRAGMA table_info(account)`);
    console.log('account 表字段:');
    accountSchema.forEach(col => {
      console.log(`  - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
    });
    
    const userInfoSchema = await db.all(`PRAGMA table_info(user_info)`);
    console.log('\nuser_info 表字段:');
    userInfoSchema.forEach(col => {
      console.log(`  - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
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