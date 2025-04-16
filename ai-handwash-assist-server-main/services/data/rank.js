const microServer = require("micro-server");
const { datap, utils } = microServer.helper;

const getRankList = async ({ data }) => {
  console.log("接收到的完整请求数据:", JSON.stringify(data, null, 2));
  console.log("Received role:", data.role);
  const role = data.role || "Doctor";
  
  let filter = {
    accountID: data.accountID,
    role: role,
    total: { $exists: true }
  };

  // 改进日期过滤逻辑
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 将日期字符串转换为 Date 对象进行比较
    const startDate = new Date(data.dateRange.start);
    const endDate = new Date(data.dateRange.end);
    endDate.setHours(23, 59, 59, 999); // 设置结束日期为当天的最后一刻
    
    filter.date = {
      $gte: data.dateRange.start,
      $lte: data.dateRange.end
    };
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    filter.date = {
      $gte: formattedDate,
      $lte: `${formattedDate} 23:59:59`
    };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：total 从高到低
  const sort = { total: -1 };

  // 查询满足条件的记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(`找到 ${records.length} 条记录`);

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

  // 改进日期过滤逻辑
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 将日期字符串转换为 Date 对象进行比较
    const startDate = new Date(data.dateRange.start);
    const endDate = new Date(data.dateRange.end);
    endDate.setHours(23, 59, 59, 999); // 设置结束日期为当天的最后一刻
    
    filter.date = {
      $gte: data.dateRange.start,
      $lte: data.dateRange.end
    };
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    filter.date = {
      $gte: formattedDate,
      $lte: `${formattedDate} 23:59:59`
    };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：按照 total 字段降序排列
  const sort = { total: -1 };

  // 查询满足条件的所有记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(`找到 ${records.length} 条记录`);
  
  // 将结果按 role 分组并添加统计信息
  const grouped = records.reduce((acc, record) => {
    const role = record.role || "Unknown";
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(record.total);
    return acc;
  }, {});

  // 计算每个角色的统计信息
  const stats = {};
  for (const [role, scores] of Object.entries(grouped)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    stats[role] = {
      scores,
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