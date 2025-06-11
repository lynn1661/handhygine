// update-mapped-scores.js - 更新现有数据的映射分数
const { getDb } = require('./sqliteHelper');

// 分数映射函数 - 与record.js保持一致
const mapScore = (score) => {
  if (score < 0) return 0;
  if (score > 100) return 100;
  const normalizedScore = score / 100;
  const mappedScore = 100 * Math.pow(normalizedScore, 0.4);
  return Math.round(mappedScore);
};

async function updateMappedScores() {
  console.log('🔄 开始更新现有数据的映射分数...');
  
  try {
    const db = await getDb();
    
    // 获取所有用户记录
    const users = await db.all(`
      SELECT id, total, mapped_total 
      FROM user_info 
      WHERE total > 0 OR mapped_total = 0
    `);
    
    console.log(`📊 找到 ${users.length} 条需要更新的记录`);
    
    let updateCount = 0;
    
    for (const user of users) {
      const currentTotal = user.total || 0;
      const currentMappedTotal = user.mapped_total || 0;
      const newMappedTotal = mapScore(currentTotal);
      
      // 只有当映射分数不同时才更新
      if (Math.abs(currentMappedTotal - newMappedTotal) > 0.01) {
        await db.run(
          `UPDATE user_info SET mapped_total = ? WHERE id = ?`,
          [newMappedTotal, user.id]
        );
        
        console.log(`✅ 更新用户 ID ${user.id}: 原始分数 ${currentTotal} → 映射分数 ${newMappedTotal}`);
        updateCount++;
      }
    }
    
    console.log(`🎉 成功更新了 ${updateCount} 条记录`);
    
    // 验证更新结果
    const verification = await db.all(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN mapped_total > 0 THEN 1 END) as mapped_records,
        AVG(total) as avg_original_score,
        AVG(mapped_total) as avg_mapped_score
      FROM user_info
    `);
    
    console.log('📋 更新结果统计:');
    console.log(`  - 总记录数: ${verification[0].total_records}`);
    console.log(`  - 已映射记录数: ${verification[0].mapped_records}`);
    console.log(`  - 平均原始分数: ${verification[0].avg_original_score?.toFixed(2) || 0}`);
    console.log(`  - 平均映射分数: ${verification[0].avg_mapped_score?.toFixed(2) || 0}`);
    
  } catch (error) {
    console.error('❌ 更新映射分数时出错:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateMappedScores()
    .then(() => {
      console.log('✅ 映射分数更新完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { updateMappedScores }; 