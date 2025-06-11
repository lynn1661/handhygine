// rank.js
// 改写说明：
//   - 需要根据 accountID、role、dateRange 等条件，把 user_info 表中的 JSON 字段 load 出来
//   - 原来 filter 中有 start_time 的正则匹配，这里可以用 SQLite LIKE 或正则表达式匹配
//   - 需要按 total 字段 DESC 排序，计算分组统计等

const { getDb } = require('../../sqliteHelper');

// 辅助： 将 "YYYY-MM-DD" 格式转换为 Date 对象
const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// 辅助：将 Date 转为 M/D/YYYY 格式（不含时间），用于与 start_time 文本开头做 LIKE 匹配
const formatDateForQuery = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${day}/${month}/${year}`; // 例如 "6/5/2025"
};

// getRankList: 按照 accountID、role、日期范围来筛选，该用户的所有记录，返回按 total DESC 排序的列表
const getRankList = async ({ data }) => {
  const role = data.role || 'Doctor';
  const accountID = data.accountID;

  const db = await getDb();

  // 构造 datePatterns 数组，然后转成一个 SQL LIKE 条件 ：start_time LIKE 'pattern%' OR start_time LIKE 'pattern%'
  let whereClauses = [`accountID = ?`, `role = ?`, `total IS NOT NULL`];
  const params = [accountID, role];

  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    const startDate = parseDate(data.dateRange.start);
    const endDate = parseDate(data.dateRange.end);
    endDate.setHours(23, 59, 59);

    // 生成所有日期 pattern
    const patterns = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      patterns.push(formatDateForQuery(current));
      current.setDate(current.getDate() + 1);
    }

    // 构建 SQL 中的 (start_time LIKE 'p1%' OR start_time LIKE 'p2%' OR ...)
    const likeClauses = patterns.map(() => `start_time LIKE ?`).join(' OR ');
    whereClauses.push(`(${likeClauses})`);
    // 参数对应每个 pattern + '%'
    patterns.forEach((p) => params.push(`${p}%`));
  } else {
    // 默认当天
    const todayPattern = formatDateForQuery(new Date());
    whereClauses.push(`start_time LIKE ?`);
    params.push(`${todayPattern}%`);
  }

  // 完整的查询条件字符串
  const whereStr = whereClauses.join(' AND ');
  const sqlAll = `SELECT * FROM user_info WHERE accountID = ? AND role = ? AND total IS NOT NULL ORDER BY total DESC;`;
  const sqlFiltered = `SELECT * FROM user_info WHERE ${whereStr} ORDER BY total DESC;`;

  // 调试用：先查询所有（不考虑日期），用于打印检查
  const allRows = await db.all(sqlAll, [accountID, role]);
  console.log(`总共找到 ${allRows.length} 条记录（不考虑日期筛选）`);
  if (allRows.length > 0) {
    console.log(
      '前 5 条 start_time:',
      allRows.slice(0, 5).map((r) => r.start_time)
    );
  }

  // 再查询满足过滤条件的
  const filteredRows = await db.all(sqlFiltered, params);
  console.log(`筛选后找到 ${filteredRows.length} 条记录`);
  if (filteredRows.length > 0) {
    console.log(
      '筛选后前 5 条 start_time:',
      filteredRows.slice(0, 5).map((r) => r.start_time)
    );
  }

  // 将 JSON 字段解析成 JS 对象/数组
  const records = filteredRows.map((row) => {
    return {
      id: row.id,
      accountID: row.accountID,
      userID: row.userID,
      role: row.role,
      start_time: row.start_time,
      step_points: JSON.parse(row.step_points || '[]'),
      total: row.total,
      record_time: JSON.parse(row.record_time || '[]'),
    };
  });

  return {
    message: 'Successfully retrieved rank list',
    records,
  };
};

// getAllRank: 按 accountID 查询所有（不分 role），然后按照 total 做排行、分组统计
const getAllRank = async ({ data }) => {
  const accountID = data.accountID;
  const db = await getDb();

  // 构造与上面相似的日期过滤条件
  let whereClauses = [`accountID = ?`, `total IS NOT NULL`];
  const params = [accountID];

  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    const startDate = parseDate(data.dateRange.start);
    const endDate = parseDate(data.dateRange.end);
    endDate.setHours(23, 59, 59);

    const patterns = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      patterns.push(formatDateForQuery(current));
      current.setDate(current.getDate() + 1);
    }

    const likeClauses = patterns.map(() => `start_time LIKE ?`).join(' OR ');
    whereClauses.push(`(${likeClauses})`);
    patterns.forEach((p) => params.push(`${p}%`));
  } else {
    const todayPattern = formatDateForQuery(new Date());
    whereClauses.push(`start_time LIKE ?`);
    params.push(`${todayPattern}%`);
  }

  const whereStr = whereClauses.join(' AND ');
  const sqlAll = `SELECT * FROM user_info WHERE accountID = ? AND total IS NOT NULL ORDER BY total DESC;`;
  const sqlFiltered = `SELECT * FROM user_info WHERE ${whereStr} ORDER BY total DESC;`;

  // 调试：先打印全部
  const allRows = await db.all(sqlAll, [accountID]);
  console.log(`总共找到 ${allRows.length} 条记录（不考虑日期）`);

  // 再打印过滤后的
  const filteredRows = await db.all(sqlFiltered, params);
  console.log(`筛选后找到 ${filteredRows.length} 条记录`);

  // 将结果按 role 分组并统计
  const grouped = {};
  filteredRows.forEach((row) => {
    const rec = {
      id: row.id,
      accountID: row.accountID,
      userID: row.userID,
      role: row.role,
      start_time: row.start_time,
      step_points: JSON.parse(row.step_points || '[]'),
      total: row.total,
      record_time: JSON.parse(row.record_time || '[]'),
    };

    if (!grouped[row.role]) {
      grouped[row.role] = { records: [], scores: [] };
    }
    grouped[row.role].records.push(rec);
    grouped[row.role].scores.push(row.total);
  });

  const stats = {};
  Object.keys(grouped).forEach((role) => {
    const scores = grouped[role].scores;
    const count = scores.length;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    const mx = count > 0 ? Math.max(...scores) : 0;
    const mn = count > 0 ? Math.min(...scores) : 0;
    stats[role] = {
      records: grouped[role].records,
      scores,
      stats: {
        count,
        average: avg,
        max: mx,
        min: mn,
      },
    };
  });

  return {
    message: 'Successfully retrieved all rank lists',
    records: stats,
  };
};

module.exports = { getRankList, getAllRank };