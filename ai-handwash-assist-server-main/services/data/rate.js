const microServer = require("micro-server");
const { utils } = microServer.helper;
const { datap } = require('../../database/db-helper');  // 使用新的数据库帮助器

const rating = async ({ data }) => {
  // 验证必须字段
  if (!data.id || data.rating === undefined || data.rating === null) {
    const err = new Error("Missing field. Required fields: id and rating.");
    err.code = 400;
    throw err;
  }

  // 根据传入的 id 查找用户记录
  const res = await datap.sqlite.readid2("user_info", data.id);
  if (!res) {
    const err = new Error("Record not found");
    err.code = 404;
    throw err;
  }
  
  var update_res = res;
  update_res.id = update_res._id;
  delete update_res._id;
  if (
    !(
      update_res?.lastModified === undefined ||
      update_res?.lastModified === null
    )
  ) {
    delete update_res.lastModified;
  }

  // 更新用户信息
  update_res.rating = data.rating;
  if (data.points) {
    update_res.points = data.points;
  }
  if (data.step_video_file) {
    update_res.step_video_file = data.step_video_file;
  }

  // 保存评分记录
  const ratingRecord = {
    userId: data.id,
    rating: data.rating,
    points: data.points || 0,
    step_video_file: data.step_video_file || null
  };

  const rating_result = await datap.sqlite.create("rating", ratingRecord);
  
  // 更新用户最佳得分
  if (data.points && (!res.bestScore || data.points > res.bestScore)) {
    await datap.sqlite.update("user_info", { accountSerialNumber: data.id }, { bestScore: data.points });
  }

  return {
    message: "Rating saved successfully",
    ratingId: rating_result._id,
    points: data.points || 0
  };
};

const get = async ({ data }) => {
  // 验证必须字段
  if (!data.id) {
    const err = new Error("Missing field. Required field: id.");
    err.code = 400;
    throw err;
  }

  // 获取用户的所有评分记录
  const ratings = await datap.sqlite.read("rating", { userId: data.id });
  
  return {
    message: "Ratings retrieved successfully",
    ratings: ratings,
    total: ratings.length
  };
};

const getTop = async ({ data }) => {
  const limit = data?.limit || 10;
  
  try {
    // 获取排行榜数据
    const topUsers = await datap.sqlite.getRankings("user_info", limit);
    
    return {
      message: "Top ratings retrieved successfully",
      rankings: topUsers.map((user, index) => ({
        rank: index + 1,
        accountSerialNumber: user.accountSerialNumber,
        name: user.name || '未知用户',
        bestScore: user.bestScore || 0
      }))
    };
  } catch (error) {
    const err = new Error("Failed to retrieve rankings");
    err.code = 500;
    throw err;
  }
};

// 获取用户统计信息
const getStats = async ({ data }) => {
  if (!data.id) {
    const err = new Error("Missing field. Required field: id.");
    err.code = 400;
    throw err;
  }

  try {
    // 获取用户基本信息
    const user = await datap.sqlite.readid2("user_info", data.id);
    if (!user) {
      const err = new Error("User not found");
      err.code = 404;
      throw err;
    }

    // 获取评分记录统计
    const ratings = await datap.sqlite.read("rating", { userId: data.id });
    const records = await datap.sqlite.read("record", { userId: data.id });

    // 计算平均分
    const avgScore = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + (r.points || 0), 0) / ratings.length 
      : 0;

    return {
      message: "User statistics retrieved successfully",
      stats: {
        totalSessions: records.length,
        totalRatings: ratings.length,
        bestScore: user.bestScore || 0,
        averageScore: Math.round(avgScore * 100) / 100,
        name: user.name,
        accountSerialNumber: user.accountSerialNumber
      }
    };
  } catch (error) {
    const err = new Error("Failed to retrieve user statistics");
    err.code = 500;
    throw err;
  }
};

module.exports = {
  rating,
  get,
  getTop,
  getStats
};