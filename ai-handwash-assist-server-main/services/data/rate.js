const RealmService = require('../database/realm-service');

// 获取Realm数据库实例
let realmService = null;

// 初始化Realm服务
const initRealmService = async () => {
  if (!realmService) {
    // 使用全局配置或默认配置
    const config = global.serverConfig || {
      db: {
        type: "realm",
        path: "./data/handwash.realm",
      },
      edge: {
        dataRetentionDays: 30,
        maxStorageSize: "100MB",
        syncInterval: 3600000,
        offlineMode: true
      }
    };
    realmService = new RealmService(config);
    await realmService.initialize();
  }
  return realmService;
};

const rating = async ({ data }) => {
  try {
    // 验证必须字段
    if (!data.id || data.rating === undefined || data.rating === null) {
      const err = new Error("Missing field. Required fields: id and rating.");
      err.code = 400;
      throw err;
    }

    // 初始化Realm服务
    const db = await initRealmService();

    // 查找用户记录
    const user = await db.findUser(data.id);
    if (!user) {
      const err = new Error("Record not found");
      err.code = 404;
      throw err;
    }

    // 计算评分点数
    let points = 0;
    let ratingText = '';
    
    switch (data.rating.toLowerCase()) {
      case 'perfect':
        points = 100;
        ratingText = 'PERFECT';
        break;
      case 'good':
        points = 80;
        ratingText = 'GOOD';
        break;
      case 'need improvement':
      case 'improvement':
        points = 60;
        ratingText = 'Need Improvement';
        break;
      default:
        points = parseFloat(data.rating) || 0;
        ratingText = data.rating.toString();
    }

    // 创建评分记录
    const ratingRecord = await db.createRating({
      userId: data.id,
      rating: ratingText,
      points: points,
      step: data.step || null,
      stepVideoFile: data.stepVideoFile || null,
      sessionId: data.sessionId || null,
      detectionAccuracy: data.detectionAccuracy || null,
      completionTime: data.completionTime || null
    });

    // 更新用户统计信息
    const currentSessions = user.totalSessions + 1;
    const currentBestScore = Math.max(user.bestScore || 0, points);
    
    await db.updateUser(data.id, {
      totalSessions: currentSessions,
      bestScore: currentBestScore
    });

    // 记录操作日志
    await db.createLog('info', `用户 ${data.id} 获得评分: ${ratingText} (${points}分)`, {
      userId: data.id,
      rating: ratingText,
      points: points,
      sessionId: data.sessionId
    });

    // 返回结果
    const result = {
      success: true,
      data: {
        id: ratingRecord._id.toString(),
        userId: ratingRecord.userId,
        rating: ratingRecord.rating,
        points: ratingRecord.points,
        step: ratingRecord.step,
        sessionId: ratingRecord.sessionId,
        createdAt: ratingRecord.createdAt,
        userStats: {
          totalSessions: currentSessions,
          bestScore: currentBestScore
        }
      }
    };

    return result;

  } catch (error) {
    console.error('评分服务错误:', error);
    
    // 记录错误日志
    if (realmService) {
      try {
        await realmService.createLog('error', `评分服务错误: ${error.message}`, {
          userId: data.id,
          error: error.stack
        });
      } catch (logError) {
        console.error('记录错误日志失败:', logError);
      }
    }

    throw error;
  }
};

// 获取用户评分历史
const getUserRatings = async ({ data }) => {
  try {
    if (!data.userId) {
      const err = new Error("Missing userId");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();
    const ratings = await db.getRatingsByUser(data.userId, data.limit || 10);
    
    return {
      success: true,
      data: ratings.map(rating => ({
        id: rating._id.toString(),
        rating: rating.rating,
        points: rating.points,
        step: rating.step,
        sessionId: rating.sessionId,
        createdAt: rating.createdAt
      }))
    };

  } catch (error) {
    console.error('获取用户评分历史错误:', error);
    throw error;
  }
};

// 获取统计信息
const getStats = async () => {
  try {
    const db = await initRealmService();
    const stats = db.getStats();
    
    return {
      success: true,
      data: stats
    };

  } catch (error) {
    console.error('获取统计信息错误:', error);
    throw error;
  }
};

module.exports = {
  rating,
  getUserRatings,
  getStats
};