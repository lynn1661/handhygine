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

const getRankings = async ({ data }) => {
  try {
    const db = await initRealmService();
    
    // 获取用户排名（按最佳分数排序）
    const users = await db.getUserRankings(data?.limit || 10);
    
    // 格式化排名数据
    const rankings = users.map((user, index) => ({
      rank: index + 1,
      accountSerialNumber: user.accountSerialNumber,
      name: user.name || '匿名用户',
      bestScore: user.bestScore || 0,
      totalSessions: user.totalSessions || 0,
      deviceId: user.deviceId,
      lastActiveAt: user.updatedAt
    }));

    // 记录查询日志
    await db.createLog('info', `获取排名数据，返回 ${rankings.length} 条记录`, {
      requestLimit: data?.limit || 10,
      resultCount: rankings.length
    });

    return {
      success: true,
      data: {
        rankings,
        totalUsers: rankings.length,
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('获取排名错误:', error);
    
    // 记录错误日志
    if (realmService) {
      try {
        await realmService.createLog('error', `获取排名错误: ${error.message}`, {
          error: error.stack
        });
      } catch (logError) {
        console.error('记录错误日志失败:', logError);
      }
    }

    throw error;
  }
};

// 获取用户个人排名
const getUserRank = async ({ data }) => {
  try {
    if (!data.userId) {
      const err = new Error("Missing userId");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();
    
    // 获取用户信息
    const user = await db.findUser(data.userId);
    if (!user) {
      const err = new Error("User not found");
      err.code = 404;
      throw err;
    }

    // 获取所有用户排名以计算当前用户的位置
    const allUsers = await db.getUserRankings(1000); // 获取更多用户来计算准确排名
    const userRank = allUsers.findIndex(u => u.accountSerialNumber === data.userId) + 1;

    return {
      success: true,
      data: {
        accountSerialNumber: user.accountSerialNumber,
        name: user.name || '匿名用户',
        rank: userRank || 'N/A',
        bestScore: user.bestScore || 0,
        totalSessions: user.totalSessions || 0,
        deviceId: user.deviceId,
        totalUsers: allUsers.length
      }
    };

  } catch (error) {
    console.error('获取用户排名错误:', error);
    throw error;
  }
};

// 获取设备排名（按设备分组）
const getDeviceRankings = async ({ data }) => {
  try {
    const db = await initRealmService();
    
    // 这里需要手动实现设备排名，因为Realm不支持复杂的聚合查询
    const allUsers = await db.getUserRankings(1000);
    
    // 按设备分组统计
    const deviceStats = {};
    allUsers.forEach(user => {
      const deviceId = user.deviceId || 'unknown';
      if (!deviceStats[deviceId]) {
        deviceStats[deviceId] = {
          deviceId,
          userCount: 0,
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalScore: 0
        };
      }
      
      deviceStats[deviceId].userCount++;
      deviceStats[deviceId].totalSessions += user.totalSessions || 0;
      deviceStats[deviceId].totalScore += user.bestScore || 0;
      deviceStats[deviceId].bestScore = Math.max(deviceStats[deviceId].bestScore, user.bestScore || 0);
    });

    // 计算平均分并排序
    const deviceRankings = Object.values(deviceStats)
      .map(device => ({
        ...device,
        averageScore: device.userCount > 0 ? (device.totalScore / device.userCount).toFixed(2) : 0
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, data?.limit || 10);

    return {
      success: true,
      data: {
        deviceRankings,
        totalDevices: Object.keys(deviceStats).length,
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('获取设备排名错误:', error);
    throw error;
  }
};

module.exports = {
  getRankings,
  getUserRank,
  getDeviceRankings
};