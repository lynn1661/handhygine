// info.js
// 改写说明：
//   1) login：原先用 datap.mongo.read("account", {...})，现在用 SQLite SELECT
//       - 密码校验仍然用 bcrypt.compare
//   2) fill：原先用 datap.mongo.create("user_info", obj)，现在 INSERT into user_info
//       - 只插入 accountID、userID、role、start_time，其他 JSON 字段留空或使用默认值

const bcrypt = require('bcrypt');
const { getDb } = require('../../sqliteHelper');

async function login({ data }) {
  // 验证必需字段：accountID、password
  if (!data.accountID || !data.password) {
    const err = new Error('Missing field. Required fields: accountID and password');
    err.code = 400;
    throw err;
  }

  const db = await getDb();
  // 查询 account 表，看是否存在该 accountID
  const row = await db.get(
    `SELECT accountID, password FROM account WHERE accountID = ?;`,
    data.accountID
  );

  if (!row) {
    const err = new Error('Invalid ID');
    err.code = 401;
    throw err;
  }

  // 验证 bcrypt 哈希密码
  const isValid = await bcrypt.compare(data.password, row.password);
  if (!isValid) {
    const err = new Error('Password wrong');
    err.code = 401;
    throw err;
  }

  // 验证通过
  return { message: 'Successfully Login', ID: row.accountID };
}

async function register({ data }) {
  // 验证必需字段：accountID、password
  if (!data.accountID || !data.password) {
    const err = new Error('Missing field. Required fields: accountID and password');
    err.code = 400;
    throw err;
  }

  // 验证账户ID和密码不能为空
  if (data.accountID.trim() === '' || data.password.trim() === '') {
    const err = new Error('AccountID and password cannot be empty');
    err.code = 400;
    throw err;
  }

  // 验证密码长度
  if (data.password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.code = 400;
    throw err;
  }

  const db = await getDb();

  // 检查账户ID是否已存在
  const existingAccount = await db.get(
    `SELECT accountID FROM account WHERE accountID = ?;`,
    data.accountID
  );

  if (existingAccount) {
    const err = new Error('AccountID already exists');
    err.code = 409;
    throw err;
  }

  // 对密码进行哈希
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 插入新账户
  const result = await db.run(
    `INSERT INTO account (accountID, password) VALUES (?, ?);`,
    data.accountID,
    hashedPassword
  );

  if (result.stmt.changes === 0) {
    const err = new Error('Failed to create account');
    err.code = 500;
    throw err;
  }

  return {
    message: 'Account created successfully',
    accountID: data.accountID
  };
}

async function fill({ data }) {
  // 验证必需字段：accountID、role（userID 可以为空）
  if (!data.accountID) {
    const err = new Error('Missing field. Required field: accountID');
    err.code = 400;
    throw err;
  }
  if (data.accountID === '' || data.role === '') {
    const err = new Error('Empty field detected! accountID and role are required');
    err.code = 400;
    throw err;
  }

  const db = await getDb();

  // 插入 user_info 的记录，只写入最基本字段，其它 JSON 字段留空
  const nowStr = new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' });

  // userID 可以为空，如果为空则使用空字符串
  const userIdValue = data.userID || '';

  const result = await db.run(
    `INSERT INTO user_info (accountID, userID, role, start_time, step_points, total, mapped_total, record_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    data.accountID,
    userIdValue,
    data.role,
    nowStr,
    JSON.stringify([]), // step_points
    0,                  // total 初始为 0
    0,                  // mapped_total 初始为 0
    JSON.stringify([])  // record_time
  );

  if (result.stmt.changes === 0) {
    const err = new Error('Cannot save');
    err.code = 500;
    throw err;
  }

  return {
    message: 'Successfully Choose Role',
    ID: result.lastID, // SQLite 自增 ID
  };
}

module.exports = { login, register, fill };