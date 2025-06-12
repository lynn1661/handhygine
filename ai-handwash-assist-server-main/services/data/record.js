// record.js
// 简化版本：
//   1) append_rating({ data }): 根据 data.sessionID 更新训练会话的记录
//   2) get_rank({ data }): 根据 data.sessionID 获取排名信息

const { getDb } = require('../../sqliteHelper');

// append_rating: 往某个训练会话记录里追加一步评分
const append_rating = async ({ data }) => {
  // 必须带 data.sessionID
  if (!data.sessionID) {
    const err = new Error('missing field. required field: sessionID');
    err.code = 400;
    throw err;
  }

  const db = await getDb();

  // 1) 读取这条记录
  const row = await db.get(`SELECT * FROM user_info WHERE id = ?;`, data.sessionID);
  if (!row) {
    const err = new Error('Session not found');
    err.code = 404;
    throw err;
  }

  // 2) 把需要更新的字段 parse 出来
  let step_points = [];
  let record_time = [];
  let total = 0;

  try {
    step_points = JSON.parse(row.step_points || '[]');
  } catch {
    step_points = [];
  }
  try {
    record_time = JSON.parse(row.record_time || '[]');
  } catch {
    record_time = [];
  }
  total = typeof row.total === 'number' ? row.total : 0;

  // 3) 根据 data.points 更新数组
  // record_time 追加 { timestamp, datestring }
  record_time.push({
    timestamp: Date.now(),
    datestring: new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }),
  });

  // step_points 追加 { Step: data.points }
  step_points.push({ Step: data.points });

  // 计算新的 total：把所有 step_points 中的 Step 数值相加
  total = step_points.reduce((acc, cur) => acc + Number(cur.Step), 0);

  // 分数映射函数 - 计算映射后的分数
  const mapScore = (score) => {
    if (score < 0) return 0;
    if (score > 100) return 100;
    const normalizedScore = score / 100;
    const mappedScore = 100 * Math.pow(normalizedScore, 0.4);
    return Math.round(mappedScore);
  };

  const mappedTotal = mapScore(total);

  // 4) 写回数据库，同时更新原始分数和映射后的分数
  const result = await db.run(
    `UPDATE user_info
     SET step_points = ?,
         record_time = ?,
         total = ?,
         mapped_total = ?
     WHERE id = ?;`,
    JSON.stringify(step_points),
    JSON.stringify(record_time),
    total,
    mappedTotal,
    data.sessionID
  );

  if (result.stmt.changes === 0) {
    const err = new Error('Failed to update record');
    err.code = 500;
    throw err;
  }

  return { message: 'Successfully updated' };
};

// get_rank: 取出单个训练会话的 total、step_points，然后与所有记录的 total 做比较，算出排名百分比、等级
const get_rank = async ({ data }) => {
  if (!data.sessionID) {
    const err = new Error('Missing field: sessionID is required');
    err.code = 400;
    throw err;
  }

  const db = await getDb();

  // 1) 先读取该会话记录
  const row = await db.get(`SELECT * FROM user_info WHERE id = ?;`, data.sessionID);
  if (!row) {
    const err = new Error('Session data not found');
    err.code = 500;
    throw err;
  }

  // 2) 解析该用户的字段
  const userScore = typeof row.total === 'number' ? row.total : 0;
  const mappedUserScore = typeof row.mapped_total === 'number' ? row.mapped_total : 0;
  let step_points = [];

  try {
    step_points = JSON.parse(row.step_points || '[]');
  } catch {
    step_points = [];
  }

  // 3) 读取所有记录（只要 total 值用于排名）
  const allRows = await db.all(`SELECT total FROM user_info;`);

  // 把所有记录的 total 收集到一个数组
  const allScores = allRows
    .map((r) => (typeof r.total === 'number' ? r.total : 0))
    .filter((v) => v !== undefined && v !== null);

  if (!allScores.length) {
    const err = new Error('No training data found');
    err.code = 500;
    throw err;
  }

  // 4) 计算 beatenScores 与百分比
  const totalTests = allScores.length;
  const beatenScores = allScores.filter((s) => s <= userScore).length;
  let rankPercentage = (beatenScores / totalTests) * 100;
  if (userScore >= 100) rankPercentage = 100;
  if (userScore <= 0) rankPercentage = 0;

  // 5) 计算等级：Novice / Pro / Master
  let rankLevel = 'Novice';
  if (userScore > 80) rankLevel = 'Master';
  else if (userScore > 60) rankLevel = 'Pro';

  // 6) 分数映射函数 - 与前端保持一致
  const mapScore = (score) => {
    if (score < 0) return 0;
    if (score > 100) return 100;
    const normalizedScore = score / 100;
    const mappedScore = 100 * Math.pow(normalizedScore, 0.4);
    return Math.round(mappedScore);
  };

  // 7) 排名百分比映射函数 - 与前端保持一致
  const mapRankPercentage = (percentage) => {
    if (percentage < 0) return 0;
    if (percentage > 100) return 100;
    const normalizedPercentage = percentage / 100;
    const mappedPercentage = 100 * Math.pow(normalizedPercentage, 0.5);
    return Math.round(mappedPercentage);
  };

  return {
    userScore, // 原始分数
    mappedScore: mappedUserScore || mapScore(userScore), // 优先使用数据库中的映射分数
    totalTests,
    beatenScores,
    rankLevel,
    rankPercentage, // 原始排名百分比
    mappedRankPercentage: mapRankPercentage(rankPercentage), // 映射后的排名百分比
    step_points: step_points,
  };
};

module.exports = { append_rating, get_rank };