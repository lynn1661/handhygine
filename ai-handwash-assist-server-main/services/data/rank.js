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

  // 如果传入了日期范围，则构造过滤条件 - 针对字符串格式的日期优化比较方式
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 修改为使用 $regex 匹配日期字符串的前缀，以处理可能的格式差异
    // 例如，如果数据库中有 "2025-04-15 12:00:00" 这样的格式，也能匹配到
    filter.$or = [
      // 精确匹配日期
      {
        date: {
          $gte: data.dateRange.start,
          $lte: data.dateRange.end
        }
      },
      // 匹配日期前缀，处理可能带有时间的情况
      {
        date: {
          $regex: new RegExp(`^(${data.dateRange.start}|${data.dateRange.end})`)
        }
      }
    ];
    
    // 删除之前的 date 条件，避免冲突
    delete filter.date;
  } else {
    // 如果没有指定日期范围，可以默认筛选当天的成绩
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    console.log(`默认查询日期: ${formattedDate}`);
    
    // 使用正则表达式匹配日期前缀
    filter.date = { $regex: new RegExp(`^${formattedDate}`) };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：total 从高到低
  const sort = { total: -1 };

  // 先查询所有记录，不加日期条件，看看有多少数据
  const allRecords = await datap.mongo.read("user_info", { 
    accountID: data.accountID,
    role: role,
    total: { $exists: true } 
  }, 0, 0, sort);
  console.log(`数据库中总共有 ${allRecords.length} 条匹配的记录（不含日期条件）`);
  
  if (allRecords.length > 0) {
    console.log("样本记录的日期格式:", allRecords[0].date);
  }

  // 读取满足条件的记录，这里 limit 和 skip 设为 0 表示不限制
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

  // 构造过滤条件：只筛选 accountID 指定的记录，并且必须存在 total 字段
  let filter = {
    accountID: data.accountID,
    total: { $exists: true }
  };

  // 如果传入了日期范围，则构造过滤条件 - 针对字符串格式的日期优化比较方式
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    console.log(`查询日期范围: ${data.dateRange.start} 到 ${data.dateRange.end}`);
    
    // 修改为使用 $regex 匹配日期字符串的前缀，以处理可能的格式差异
    filter.$or = [
      // 精确匹配日期
      {
        date: {
          $gte: data.dateRange.start,
          $lte: data.dateRange.end
        }
      },
      // 匹配日期前缀，处理可能带有时间的情况
      {
        date: {
          $regex: new RegExp(`^(${data.dateRange.start}|${data.dateRange.end})`)
        }
      }
    ];
    
    // 删除之前的 date 条件，避免冲突
    delete filter.date;
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    console.log(`默认查询日期: ${formattedDate}`);
    
    // 使用正则表达式匹配日期前缀
    filter.date = { $regex: new RegExp(`^${formattedDate}`) };
  }
  
  console.log("最终的查询条件:", JSON.stringify(filter, null, 2));
  
  // 构造排序条件：按照 total 字段降序排列
  const sort = { total: -1 };

  // 先查询所有记录，不加日期条件，看看有多少数据
  const allRecords = await datap.mongo.read("user_info", { 
    accountID: data.accountID,
    total: { $exists: true } 
  }, 0, 0, sort);
  console.log(`数据库中总共有 ${allRecords.length} 条匹配的记录（不含日期条件）`);
  
  if (allRecords.length > 0) {
    console.log("样本记录的日期格式:", allRecords[0].date);
  }

  // 查询满足条件的所有记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(`找到 ${records.length} 条记录`);
  
  // 将结果按 role 分组：每个 role 对应一个数组
  const grouped = records.reduce((acc, record) => {
    // 如果记录中没有 role，则默认使用 "Unknown"
    const role = record.role || "Unknown";
    if (!acc[role]) {
      acc[role] = [];
    }
    // 只存储 total 字段的值
    acc[role].push(record.total);
    return acc;
  }, {});

  return {
    message: "Successfully retrieved all rank lists",
    records: grouped
  };
};

module.exports = { getRankList, getAllRank };