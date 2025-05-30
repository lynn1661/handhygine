const microServer = require("micro-server");
const { utils } = microServer.helper;
const { datap } = require('../../database/db-helper');  // 使用新的数据库帮助器

const getRank = async ({ data }) => {
  // 验证必须字段
  if (!data.id) {
    const err = new Error("Missing field: id is required");
    err.code = 400;
    throw err;
  }

  try {
    // 获取当前用户信息
    const user = await datap.sqlite.readid2("user_info", data.id);
    if (!user) {
      const err = new Error("User not found");
      err.code = 404;
      throw err;
    }

    const userScore = user.bestScore || 0;

    // 获取所有用户的最佳分数
    const allUsers = await datap.sqlite.read("user_info");
    const allScores = allUsers.map(u => u.bestScore || 0).filter(score => score >= 0);

    if (allScores.length === 0) {
      return {
        userScore: userScore,
        rankLevel: "Novice",
        rankPercentage: 0,
        totalUsers: 0,
        rank: 1
      };
    }

    // 计算用户排名
    const sortedScores = allScores.sort((a, b) => b - a);
    const userRank = sortedScores.findIndex(score => score <= userScore) + 1;
    const beatenCount = allScores.filter(score => score < userScore).length;
    const rankPercentage = Math.round((beatenCount / allScores.length) * 100);

    // 根据分数确定等级
    let rankLevel = "Novice";
    if (userScore >= 90) {
      rankLevel = "Master";
    } else if (userScore >= 70) {
      rankLevel = "Expert";
    } else if (userScore >= 50) {
      rankLevel = "Pro";
    } else if (userScore >= 30) {
      rankLevel = "Intermediate";
    }

    // 获取用户的训练记录
    const userRecords = await datap.sqlite.read("record", { userId: data.id });
    const userRatings = await datap.sqlite.read("rating", { userId: data.id });

    return {
      userScore: userScore,
      rankLevel: rankLevel,
      rankPercentage: rankPercentage,
      rank: userRank,
      totalUsers: allScores.length,
      totalSessions: userRecords.length,
      totalRatings: userRatings.length,
      averageScore: userRecords.length > 0 
        ? Math.round((userRecords.reduce((sum, r) => sum + (r.score || 0), 0) / userRecords.length) * 100) / 100
        : 0
    };
  } catch (error) {
    console.error('获取排名失败:', error);
    const err = new Error("Failed to get user rank");
    err.code = 500;
    throw err;
  }
};

const getLeaderboard = async ({ data }) => {
  const limit = data?.limit || 10;
  const page = data?.page || 1;
  const offset = (page - 1) * limit;

  try {
    // 获取所有用户并按最佳分数排序
    const allUsers = await datap.sqlite.read("user_info");
    const sortedUsers = allUsers
      .filter(user => (user.bestScore || 0) > 0)
      .sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0))
      .slice(offset, offset + limit);

    const leaderboard = sortedUsers.map((user, index) => ({
      rank: offset + index + 1,
      accountSerialNumber: user.accountSerialNumber,
      name: user.name || '未知用户',
      bestScore: user.bestScore || 0,
      totalSessions: user.totalSessions || 0
    }));

    return {
      message: "Leaderboard retrieved successfully",
      leaderboard: leaderboard,
      page: page,
      limit: limit,
      total: allUsers.filter(user => (user.bestScore || 0) > 0).length
    };
  } catch (error) {
    console.error('获取排行榜失败:', error);
    const err = new Error("Failed to get leaderboard");
    err.code = 500;
    throw err;
  }
};

const getGlobalStats = async ({ data }) => {
  try {
    // 获取全局统计数据
    const allUsers = await datap.sqlite.read("user_info");
    const allRecords = await datap.sqlite.read("record");
    const allRatings = await datap.sqlite.read("rating");

    const totalUsers = allUsers.length;
    const totalSessions = allRecords.length;
    const totalRatings = allRatings.length;

    // 计算平均分
    const scoresWithRecords = allUsers.filter(user => (user.bestScore || 0) > 0);
    const averageScore = scoresWithRecords.length > 0
      ? Math.round((scoresWithRecords.reduce((sum, user) => sum + (user.bestScore || 0), 0) / scoresWithRecords.length) * 100) / 100
      : 0;

    // 最高分
    const highestScore = allUsers.reduce((max, user) => Math.max(max, user.bestScore || 0), 0);

    // 按等级分布统计
    const levelDistribution = {
      Master: allUsers.filter(user => (user.bestScore || 0) >= 90).length,
      Expert: allUsers.filter(user => (user.bestScore || 0) >= 70 && (user.bestScore || 0) < 90).length,
      Pro: allUsers.filter(user => (user.bestScore || 0) >= 50 && (user.bestScore || 0) < 70).length,
      Intermediate: allUsers.filter(user => (user.bestScore || 0) >= 30 && (user.bestScore || 0) < 50).length,
      Novice: allUsers.filter(user => (user.bestScore || 0) < 30).length
    };

    return {
      message: "Global statistics retrieved successfully",
      stats: {
        totalUsers: totalUsers,
        totalSessions: totalSessions,
        totalRatings: totalRatings,
        averageScore: averageScore,
        highestScore: highestScore,
        levelDistribution: levelDistribution,
        activeUsers: scoresWithRecords.length
      }
    };
  } catch (error) {
    console.error('获取全局统计失败:', error);
    const err = new Error("Failed to get global statistics");
    err.code = 500;
    throw err;
  }
};

const updateScore = async ({ data }) => {
  // 验证必须字段
  if (!data.userId || data.score === undefined) {
    const err = new Error("Missing fields. Required fields: userId, score");
    err.code = 400;
    throw err;
  }

  try {
    // 获取用户当前信息
    const user = await datap.sqlite.readid2("user_info", data.userId);
    if (!user) {
      const err = new Error("User not found");
      err.code = 404;
      throw err;
    }

    // 只有当新分数更高时才更新最佳分数
    const currentBestScore = user.bestScore || 0;
    const newScore = data.score;

    if (newScore > currentBestScore) {
      await datap.sqlite.update("user_info", 
        { accountSerialNumber: data.userId }, 
        { bestScore: newScore }
      );

      return {
        message: "Best score updated successfully",
        oldBestScore: currentBestScore,
        newBestScore: newScore,
        improved: true
      };
    } else {
      return {
        message: "Score recorded, but best score not updated",
        currentBestScore: currentBestScore,
        submittedScore: newScore,
        improved: false
      };
    }
  } catch (error) {
    console.error('更新分数失败:', error);
    const err = new Error("Failed to update score");
    err.code = 500;
    throw err;
  }
};

// 为了向后兼容，保持原有的函数名
const getRankList = getLeaderboard;

module.exports = {
  getRank,
  getRankList,
  getLeaderboard,
  getGlobalStats,
  updateScore
};