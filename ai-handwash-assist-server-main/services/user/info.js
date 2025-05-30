const bcrypt = require('bcrypt');
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

const login = async ({ data }) => {
  try {
    // 验证必须字段： accountSerialNumber 和 password
    if (!data.accountSerialNumber || !data.password) {
      const err = new Error("Missing field. Required fields: accountSerialNumber and password");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();

    // 根据传入的 accountSerialNumber 查询用户记录
    const user = await db.findUser(data.accountSerialNumber);
    if (!user) {
      const err = new Error("Invalid account serial number");
      err.code = 401;
      throw err;
    }

    // 如果用户没有密码（匿名用户），允许登录
    if (!user.password) {
      await db.createLog('info', `用户 ${data.accountSerialNumber} 匿名登录`, {
        userId: data.accountSerialNumber,
        loginType: 'anonymous'
      });

      return { 
        message: "Successfully Login (Anonymous)", 
        accountSerialNumber: user.accountSerialNumber,
        isAnonymous: true,
        userInfo: {
          name: user.name,
          totalSessions: user.totalSessions || 0,
          bestScore: user.bestScore || 0
        }
      };
    }

    // 使用 bcrypt.compare 对比前端密码和数据库中存储的加密密码
    const isValid = await bcrypt.compare(data.password, user.password);
    if (isValid) {
      // 更新最后登录时间
      await db.updateUser(data.accountSerialNumber, {
        lastSyncAt: new Date()
      });

      await db.createLog('info', `用户 ${data.accountSerialNumber} 登录成功`, {
        userId: data.accountSerialNumber,
        loginType: 'password'
      });

      return { 
        message: "Successfully Login", 
        accountSerialNumber: user.accountSerialNumber,
        isAnonymous: false,
        userInfo: {
          name: user.name,
          email: user.email,
          totalSessions: user.totalSessions || 0,
          bestScore: user.bestScore || 0
        }
      };
    } else {
      await db.createLog('warn', `用户 ${data.accountSerialNumber} 登录失败：密码错误`, {
        userId: data.accountSerialNumber
      });

      const err = new Error("Password wrong");
      err.code = 401;
      throw err;
    }
  } catch (error) {
    console.error('登录服务错误:', error);
    throw error;
  }
};

const register = async ({ data }) => {
  try {
    // 验证必须字段
    if (!data.accountSerialNumber) {
      const err = new Error("Missing field. Required field: accountSerialNumber");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();

    // 检查用户是否已存在
    const existingUser = await db.findUser(data.accountSerialNumber);
    if (existingUser) {
      const err = new Error("User already exists");
      err.code = 409;
      throw err;
    }

    // 准备用户数据
    const userData = {
      accountSerialNumber: data.accountSerialNumber,
      name: data.name || null,
      email: data.email || null,
      password: null,
      totalSessions: 0,
      bestScore: 0.0
    };

    // 如果提供了密码，进行加密
    if (data.password) {
      const saltRounds = 10;
      userData.password = await bcrypt.hash(data.password, saltRounds);
      console.log('加密后的密码:', userData.password);
    }

    // 创建用户
    const newUser = await db.createUser(userData);

    await db.createLog('info', `新用户注册: ${data.accountSerialNumber}`, {
      userId: data.accountSerialNumber,
      hasPassword: !!data.password
    });

    return {
      message: "User registered successfully",
      accountSerialNumber: newUser.accountSerialNumber,
      isAnonymous: !data.password,
      userInfo: {
        name: newUser.name,
        email: newUser.email,
        totalSessions: newUser.totalSessions,
        bestScore: newUser.bestScore
      }
    };

  } catch (error) {
    console.error('注册服务错误:', error);
    throw error;
  }
};

// 获取用户信息
const getUserInfo = async ({ data }) => {
  try {
    if (!data.accountSerialNumber) {
      const err = new Error("Missing accountSerialNumber");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();
    const user = await db.findUser(data.accountSerialNumber);
    
    if (!user) {
      const err = new Error("User not found");
      err.code = 404;
      throw err;
    }

    return {
      success: true,
      data: {
        accountSerialNumber: user.accountSerialNumber,
        name: user.name,
        email: user.email,
        totalSessions: user.totalSessions || 0,
        bestScore: user.bestScore || 0,
        deviceId: user.deviceId,
        createdAt: user.createdAt,
        lastSyncAt: user.lastSyncAt
      }
    };

  } catch (error) {
    console.error('获取用户信息错误:', error);
    throw error;
  }
};

// 更新用户信息
const updateUserInfo = async ({ data }) => {
  try {
    if (!data.accountSerialNumber) {
      const err = new Error("Missing accountSerialNumber");
      err.code = 400;
      throw err;
    }

    const db = await initRealmService();
    
    // 准备更新数据
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    
    // 如果需要更新密码
    if (data.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(data.password, saltRounds);
    }

    const updatedUser = await db.updateUser(data.accountSerialNumber, updateData);

    await db.createLog('info', `用户信息更新: ${data.accountSerialNumber}`, {
      userId: data.accountSerialNumber,
      updatedFields: Object.keys(updateData)
    });

    return {
      success: true,
      message: "User information updated successfully",
      data: {
        accountSerialNumber: updatedUser.accountSerialNumber,
        name: updatedUser.name,
        email: updatedUser.email
      }
    };

  } catch (error) {
    console.error('更新用户信息错误:', error);
    throw error;
  }
};

module.exports = { 
  login, 
  register, 
  getUserInfo, 
  updateUserInfo 
};
