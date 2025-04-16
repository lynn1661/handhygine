const microServer = require("micro-server");
const { datap, utils } = microServer.helper;

// 辅助函数：将 YYYY-MM-DD 格式转换为 ISO 日期字符串
const getISODateRange = (dateStr, isEnd = false) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isEnd) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.toISOString();
};

const getRankList = async ({ data }) => {
  console.log("接收到的完整请求数据:", JSON.stringify(data, null, 2));
  console.log("Received role:", data.role);
  const role = data.role || "Doctor";
  
  let filter = {
    accountID: data.accountID,
    role: role,
    total: { $exists: true }
  };

  // 使用 lastModified 字段进行日期过滤
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 转换为 ISO 日期格式
    const startDate = getISODateRange(data.dateRange.start);
    const endDate = getISODateRange(data.dateRange.end, true);
    
    console.log("查询时间范围:", startDate, "到", endDate);
    
    filter.lastModified = {
      $gte: startDate,
      $lte: endDate
    };
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
    
    filter.lastModified = {
      $gte: startOfDay.toISOString(),
      $lte: endOfDay.toISOString()
    };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：total 从高到低
  const sort = { total: -1 };

  // 查询满足条件的记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(`找到 ${records.length} 条记录`);
  if (records.length > 0) {
    console.log("示例记录:", {
      lastModified: records[0].lastModified,
      start_time: records[0].start_time
    });
  }

  return {
    message: "Successfully retrieved rank list",
    records,
  };
};

const getAllRank = async ({ data }) => {
  console.log("Received accountID:", data.accountID);
  console.log("接收到的完整请求数据:", JSON.stringify(data, null, 2));

  let filter = {
    accountID: data.accountID,
    total: { $exists: true }
  };

  // 使用 lastModified 字段进行日期过滤
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 转换为 ISO 日期格式
    const startDate = getISODateRange(data.dateRange.start);
    const endDate = getISODateRange(data.dateRange.end, true);
    
    console.log("查询时间范围:", startDate, "到", endDate);
    
    filter.lastModified = {
      $gte: startDate,
      $lte: endDate
    };
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
    
    filter.lastModified = {
      $gte: startOfDay.toISOString(),
      $lte: endOfDay.toISOString()
    };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：按照 total 字段降序排列
  const sort = { total: -1 };

  // 查询满足条件的所有记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(`找到 ${records.length} 条记录`);
  if (records.length > 0) {
    console.log("示例记录:", {
      lastModified: records[0].lastModified,
      start_time: records[0].start_time
    });
  }
  
  // 将结果按 role 分组并添加统计信息
  const grouped = records.reduce((acc, record) => {
    const role = record.role || "Unknown";
    if (!acc[role]) {
      acc[role] = {
        records: [],
        scores: []
      };
    }
    acc[role].records.push(record);
    acc[role].scores.push(record.total);
    return acc;
  }, {});

  // 计算每个角色的统计信息
  const stats = {};
  for (const [role, data] of Object.entries(grouped)) {
    const scores = data.scores;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    stats[role] = {
      records: data.records,
      scores: scores,
      stats: {
        count: scores.length,
        average: Math.round(avg * 100) / 100,
        max,
        min
      }
    };
  }

  return {
    message: "Successfully retrieved all rank lists",
    records: stats
  };
};

module.exports = { getRankList, getAllRank };