// rate.js
// 改写说明：
//   1) rating({data}): 根据 data.id 从 user_info 表中取出一行，更新其中的 rating 字段（新的 JSON 对象）
//   2) get_ratings({data}): 查询 user_info 表中满足日期范围的所有记录，筛选出那些带有 rating 的行，然后统计 UI、Training、Recommendation 三个分数类别

const { getDb } = require('../../sqliteHelper');

async function rating({ data }) {
  // data 必须包含 id (user_info.id) 与 rating (对象，如 {ui: x, training: y, recommend: z})
  if (!data.id || data.rating === undefined || data.rating === null) {
    const err = new Error('Missing field. Required fields: id and rating.');
    err.code = 400;
    throw err;
  }

  const db = await getDb();
  // 1) 先读取该 user_info 行
  const row = await db.get(`SELECT * FROM user_info WHERE id = ?;`, data.id);
  if (!row) {
    const err = new Error('Record not found');
    err.code = 404;
    throw err;
  }

  // 2) 更新 rating 字段
  const newRatingJson = JSON.stringify(data.rating);
  const result = await db.run(
    `UPDATE user_info SET rating = ? WHERE id = ?;`,
    newRatingJson,
    data.id
  );

  if (result.stmt.changes === 0) {
    const err = new Error('Failed to update rating');
    err.code = 500;
    throw err;
  }

  return {
    message: 'Rating successfully submitted',
    rating: data.rating,
    id: data.id,
  };
}

async function get_ratings({ data }) {
  const db = await getDb();

  // 构造日期过滤条件（如果 data.dateRange 存在且合法）
  let whereClauses = [];
  const params = [];

  if (data?.dateRange && data.dateRange.start && data.dateRange.end) {
    const startDate = new Date(data.dateRange.start);
    const endDate = new Date(data.dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    // 因为 record_time 在表中是 JSON 数组文本，里面的元素具有 timestamp 字段（Unix ms），
    // 我们可以用 SQLite JSON1 扩展来查询 JSON 中的 timestamp，但为简单起见，这里先遍历所有记录后在 JS 端做过滤。
    // 如果你要用 SQLite JSON1，可以改成：
    //   SELECT * FROM user_info
    //   WHERE json_extract(record_time, '$[0].timestamp') BETWEEN startMs AND endMs;
    // 但 record_time 可能包含多个元素，无法直接用 json_extract 简单匹配。
    // 因此下面先 SELECT 全部，再让 JS 端过滤。

    // 既然全表扫一遍，暂时不加 WHERE 条件
  }

  // 1) 查询所有 user_info
  const allRows = await db.all(`SELECT * FROM user_info;`);

  // 2) 先把带有 record_time 的行筛出来，如果需要 dateRange，则挑出元素符合范围的
  const usersWithRatings = [];

  const startMs = data?.dateRange && data.dateRange.start
    ? new Date(data.dateRange.start).getTime()
    : null;
  const endMs = data?.dateRange && data.dateRange.end
    ? new Date(data.dateRange.end).setHours(23, 59, 59, 999)
    : null;

  for (const row of allRows) {
    if (!row.rating) continue; // rating 字段为空，跳过
    let ratingObj;
    try {
      ratingObj = JSON.parse(row.rating);
    } catch {
      continue;
    }
    // 如果 rating 三项都为 0，也可视为"无评分"，原代码是筛 ui>0 || training>0 || recommend>0
    if (
      ratingObj.ui === 0 &&
      ratingObj.training === 0 &&
      ratingObj.recommend === 0
    ) {
      continue;
    }

    // 如果指定 dateRange, 要判断 record_time 数组里是否有至少一个 timestamp 在范围内
    if (startMs !== null && endMs !== null) {
      let recordArr;
      try {
        recordArr = JSON.parse(row.record_time || '[]');
      } catch {
        recordArr = [];
      }
      // 看 recordArr 里是否存在 timestamp 字段在 [startMs, endMs] 范围
      const anyInRange = recordArr.some((r) => {
        const ts = typeof r.timestamp === 'number' ? r.timestamp : Number(r.timestamp);
        return ts >= startMs && ts <= endMs;
      });
      if (!anyInRange) continue; // 没有符合范围的记录，则不加入
    }

    usersWithRatings.push({
      id: row.id,
      accountID: row.accountID,
      rating: ratingObj,
    });
  }

  // 3) 按照 UI/Training/Recommendation 三个类别分别收集分数，转换到 0-100 制
  const ratingCategories = {
    UI: [],
    Training: [],
    Recommendation: [],
  };

  usersWithRatings.forEach((u) => {
    const r = u.rating;
    if (r.ui > 0) {
      ratingCategories.UI.push(r.ui * 20);
    }
    if (r.training > 0) {
      ratingCategories.Training.push(r.training * 20);
    }
    if (r.recommend > 0) {
      ratingCategories.Recommendation.push(r.recommend * 20);
    }
  });

  // 4) 计算统计数据
  const calculateStats = (scores) => {
    if (!scores.length) return { count: 0, average: 0, max: 0, min: 0 };
    const count = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = parseFloat((sum / count).toFixed(2));
    const mx = Math.max(...scores);
    const mn = Math.min(...scores);
    return { count, average: avg, max: mx, min: mn };
  };

  const result = {
    totalUsers: usersWithRatings.length,
    ratingsByCategory: {
      UI: {
        scores: ratingCategories.UI,
        stats: calculateStats(ratingCategories.UI),
      },
      Training: {
        scores: ratingCategories.Training,
        stats: calculateStats(ratingCategories.Training),
      },
      Recommendation: {
        scores: ratingCategories.Recommendation,
        stats: calculateStats(ratingCategories.Recommendation),
      },
    },
  };

  return result;
}

module.exports = { rating, get_ratings };