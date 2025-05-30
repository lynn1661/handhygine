const microServer = require("micro-server");
const { utils } = microServer.helper;
const { datap } = require('../../database/db-helper');  // 使用新的数据库帮助器

const record = async ({ data }) => {
  // 验证必须字段
  if (!data.userId) {
    const err = new Error("Missing field. Required field: userId.");
    err.code = 400;
    throw err;
  }

  // 创建洗手记录
  const recordData = {
    userId: data.userId,
    sessionData: typeof data.sessionData === 'object' ? JSON.stringify(data.sessionData) : data.sessionData,
    score: data.score || 0,
    duration: data.duration || 0,
    steps: typeof data.steps === 'object' ? JSON.stringify(data.steps) : data.steps
  };

  try {
    const result = await datap.sqlite.create("record", recordData);
    
    // 更新用户的总会话数
    const user = await datap.sqlite.readid2("user_info", data.userId);
    if (user) {
      const newTotalSessions = (user.totalSessions || 0) + 1;
      await datap.sqlite.update("user_info", 
        { accountSerialNumber: data.userId }, 
        { totalSessions: newTotalSessions }
      );
    }

    return {
      message: "Record saved successfully",
      recordId: result._id,
      score: data.score || 0
    };
  } catch (error) {
    const err = new Error("Failed to save record");
    err.code = 500;
    throw err;
  }
};

const get = async ({ data }) => {
  // 验证必须字段
  if (!data.userId) {
    const err = new Error("Missing field. Required field: userId.");
    err.code = 400;
    throw err;
  }

  try {
    // 获取用户的所有记录
    const records = await datap.sqlite.read("record", { userId: data.userId });
    
    // 解析JSON字段
    const formattedRecords = records.map(record => ({
      ...record,
      sessionData: record.sessionData ? JSON.parse(record.sessionData) : null,
      steps: record.steps ? JSON.parse(record.steps) : null
    }));

    return {
      message: "Records retrieved successfully",
      records: formattedRecords,
      total: formattedRecords.length
    };
  } catch (error) {
    const err = new Error("Failed to retrieve records");
    err.code = 500;
    throw err;
  }
};

const getRecent = async ({ data }) => {
  const limit = data?.limit || 10;
  const userId = data?.userId;

  try {
    let records;
    if (userId) {
      records = await datap.sqlite.read("record", { userId: userId });
    } else {
      records = await datap.sqlite.read("record");
    }

    // 按创建时间排序并限制数量
    const sortedRecords = records
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    // 解析JSON字段
    const formattedRecords = sortedRecords.map(record => ({
      ...record,
      sessionData: record.sessionData ? JSON.parse(record.sessionData) : null,
      steps: record.steps ? JSON.parse(record.steps) : null
    }));

    return {
      message: "Recent records retrieved successfully",
      records: formattedRecords,
      total: formattedRecords.length
    };
  } catch (error) {
    const err = new Error("Failed to retrieve recent records");
    err.code = 500;
    throw err;
  }
};

const deleteRecord = async ({ data }) => {
  if (!data.recordId) {
    const err = new Error("Missing field. Required field: recordId.");
    err.code = 400;
    throw err;
  }

  try {
    const result = await datap.sqlite.delete("record", { id: data.recordId });
    
    if (result.deletedCount === 0) {
      const err = new Error("Record not found");
      err.code = 404;
      throw err;
    }

    return {
      message: "Record deleted successfully",
      deletedCount: result.deletedCount
    };
  } catch (error) {
    const err = new Error("Failed to delete record");
    err.code = 500;
    throw err;
  }
};

// 获取用户记录统计
const getStats = async ({ data }) => {
  if (!data.userId) {
    const err = new Error("Missing field. Required field: userId.");
    err.code = 400;
    throw err;
  }

  try {
    const records = await datap.sqlite.read("record", { userId: data.userId });
    
    if (records.length === 0) {
      return {
        message: "No records found for user",
        stats: {
          totalRecords: 0,
          averageScore: 0,
          bestScore: 0,
          totalDuration: 0,
          averageDuration: 0
        }
      };
    }

    const scores = records.map(r => r.score || 0);
    const durations = records.map(r => r.duration || 0);

    const stats = {
      totalRecords: records.length,
      averageScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
      bestScore: Math.max(...scores),
      totalDuration: durations.reduce((sum, duration) => sum + duration, 0),
      averageDuration: Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) * 100) / 100
    };

    return {
      message: "Record statistics retrieved successfully",
      stats: stats
    };
  } catch (error) {
    const err = new Error("Failed to retrieve record statistics");
    err.code = 500;
    throw err;
  }
};

module.exports = {
  record,
  get,
  getRecent,
  deleteRecord,
  getStats
};