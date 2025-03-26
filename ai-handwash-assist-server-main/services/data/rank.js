const microServer = require("micro-server");
const { datap, utils } = microServer.helper;

const getRankList = async ({ data }) => {
  console.log("Received role:", data.role);
  const role = data.role || "Doctor";
  
  let filter = {
    accountID: "user", // 固定用户名
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

module.exports = { getRankList };