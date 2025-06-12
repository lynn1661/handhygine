// info.js
// 简化版本：
//   - 删除登录功能
//   - fill：只需要角色信息，创建训练记录

const { getDb } = require('../../sqliteHelper');

// 登录相关功能已删除，现在是匿名系统

async function fill({ data }) {
  const db = await getDb();

  // 插入 user_info 的记录，创建新的训练会话
  const nowStr = new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' });

  const result = await db.run(
    `INSERT INTO user_info (start_time, step_points, total, mapped_total, record_time)
     VALUES (?, ?, ?, ?, ?);`,
    nowStr,
    JSON.stringify([]), // step_points
    0,                  // total 初始为 0
    0,                  // mapped_total 初始为 0
    JSON.stringify([])  // record_time
  );

  if (result.stmt.changes === 0) {
    const err = new Error('Cannot save');
    err.code = 500;
    throw err;
  }

  return {
    message: 'Successfully Created Session',
    ID: result.lastID, // 返回会话ID
  };
}

module.exports = { fill };