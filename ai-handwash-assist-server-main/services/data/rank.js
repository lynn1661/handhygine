const microServer = require("micro-server");
const { datap, utils } = microServer.helper;

const getRankList = async ({ data }) => {
  console.log("Received role:", data.role);
  const role = data.role || "Doctor";
  
  let filter = {
    accountID: data.accountID,
    role: role,
    total: { $exists: true }
  };

  // 如果传入了日期范围，则构造过滤条件
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    filter.date = {
      $gte: data.dateRange.start,
      $lte: data.dateRange.end
    };
  } else {
    // 如果没有指定日期范围，可以默认筛选当天的成绩
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    filter.date = formattedDate;
  }
  
  // 构造排序条件：total 从高到低
  const sort = { total: -1 };

  // 读取满足条件的记录，这里 limit 和 skip 设为 0 表示不限制
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);

  return {
    message: "Successfully retrieved rank list",
    records,
  };
};

const getAllRank = async ({ data }) => {
  console.log("Received accountID:", data.accountID);

  // 构造过滤条件：只筛选 accountID 指定的记录，并且必须存在 total 字段
  let filter = {
    accountID: data.accountID,
    total: { $exists: true }
  };

  // 如果传入了日期范围，则构造过滤条件
  if (data.dateRange && data.dateRange.start && data.dateRange.end) {
    filter.date = {
      $gte: data.dateRange.start,
      $lte: data.dateRange.end
    };
  } else {
    // 如果没有指定日期范围，默认筛选当天的记录
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    filter.date = formattedDate;
  }
  
  // 构造排序条件：按照 total 字段降序排列
  const sort = { total: -1 };

  // 查询满足条件的所有记录
  const records = await datap.mongo.read("user_info", filter, 0, 0, sort);
  console.log(records);
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