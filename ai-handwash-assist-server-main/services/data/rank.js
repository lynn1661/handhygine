const microServer = require("micro-server");
const { datap, utils } = microServer.helper;

// 辅助函数：将 YYYY-MM-DD 格式转换为日期对象
const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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

  // 改进日期过滤逻辑，处理 start_time 字段
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 解析日期范围
    const startDate = parseDate(data.dateRange.start);
    const endDate = parseDate(data.dateRange.end);
    
    // 构建日期匹配模式
    const datePatterns = [];
    const currentDate = new Date(startDate);
    
    // 生成日期范围内的所有日期匹配模式
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      // 匹配 "YYYY/M/D" 格式，考虑上午/下午的情况
      datePatterns.push(`${year}/${month}/${day}`);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 使用 $regex 匹配任意一个日期模式
    filter.start_time = {
      $regex: new RegExp(datePatterns.join('|')),
    };
    
    console.log("日期匹配模式:", datePatterns);
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // 匹配今天的日期格式
    filter.start_time = {
      $regex: new RegExp(`${year}/${month}/${day}`),
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

  // 改进日期过滤逻辑，处理 start_time 字段
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 解析日期范围
    const startDate = parseDate(data.dateRange.start);
    const endDate = parseDate(data.dateRange.end);
    
    // 构建日期匹配模式
    const datePatterns = [];
    const currentDate = new Date(startDate);
    
    // 生成日期范围内的所有日期匹配模式
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      // 匹配 "YYYY/M/D" 格式，考虑上午/下午的情况
      datePatterns.push(`${year}/${month}/${day}`);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 使用 $regex 匹配任意一个日期模式
    filter.start_time = {
      $regex: new RegExp(datePatterns.join('|')),
    };
    
    console.log("日期匹配模式:", datePatterns);
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // 匹配今天的日期格式
    filter.start_time = {
      $regex: new RegExp(`${year}/${month}/${day}`),
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