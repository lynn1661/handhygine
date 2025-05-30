const microServer = require("micro-server");
const { utils } = microServer.helper;
const { datap } = require('../../database/db-helper');  // 使用新的数据库帮助器
const isLogEnabled = require('micro-server').config.log === true;
const bcrypt = require('bcrypt');

const login = async ({ data }) => {
  // 验证必须字段： accountID 和 password
  if (!data.accountID || !data.password) {
    const err = new Error("Missing field. Required fields: accountID and password");
    err.code = 400;
    throw err;
  }

  // 根据传入的 accountID 查询用户记录
  const records = await datap.sqlite.read("account", { accountID: data.accountID });
  if (!records || records.length === 0) {
    const err = new Error("Invalid ID");
    err.code = 401;
    throw err;
  }
  
  // 假设 accountID 唯一，取第一个匹配的记录
  const user = records[0];
  // 使用 bcrypt.compare 对比前端密码和数据库中存储的加密密码
  const isValid = await bcrypt.compare(data.password, user.password);
  if (isValid) {
    return { message: "Successfully Login", ID: user.accountID };
  } else {
    const err = new Error("Password wrong");
    err.code = 401;
    throw err;
  }
};

const register = async ({ data }) => {
  // 验证必须字段
  if (!data.accountID || !data.password || !data.name) {
    const err = new Error("Missing field. Required fields: accountID, password, and name");
    err.code = 400;
    throw err;
  }

  // 检查用户是否已经存在
  const existingUser = await datap.sqlite.read("account", { accountID: data.accountID });
  if (existingUser && existingUser.length > 0) {
    const err = new Error("User already exists");
    err.code = 409;
    throw err;
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(data.password, 10);
  if (isLogEnabled) {
    console.log('加密后的密码:', hashedPassword);
  }

  // 生成唯一的序列号
  const accountSerialNumber = `USER_${Date.now()}`;

  // 创建新用户
  const newUser = {
    accountID: data.accountID,
    accountSerialNumber: accountSerialNumber,
    password: hashedPassword,
    name: data.name,
    email: data.email || null,
    totalSessions: 0,
    bestScore: 0
  };

  const result = await datap.sqlite.create("account", newUser);
  
  return { 
    message: "User registered successfully", 
    ID: result.accountID,
    serialNumber: result.accountSerialNumber
  };
};

module.exports = {
  login,
  register
};
