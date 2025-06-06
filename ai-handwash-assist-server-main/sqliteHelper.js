// sqliteHelper.js
// 负责：
//   1) 打开（或创建）SQLite 数据库
//   2) 在首次打开时创建两张表：account 与 user_info
//   3) 导出 getDb()，供其他模块 async/await 取用

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let dbPromise = null;

async function initDb() {
  // 支持环境变量配置数据库路径，默认为 ./data.db
  const dbPath = process.env.DB_PATH || './data.db';
  
  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`创建数据库目录: ${dbDir}`);
  }
  
  console.log(`SQLite数据库路径: ${dbPath}`);
  
  // 打开或创建数据库
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // 创建 account 表（如果不存在）
  // 字段：accountID（TEXT PK），password（TEXT，用 bcrypt 存储的哈希）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      accountID TEXT PRIMARY KEY,
      password  TEXT NOT NULL
      -- 如果有其他字段，例如 email、name，可在此添加
    );
  `);

  // 创建 user_info 表（如果不存在）
  // 为了兼容原先 Mongo 方案里可能出现的数组/对象字段，这里将这些字段全部存在 JSON TEXT
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_info (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      accountID        TEXT NOT NULL,           -- 外键, 对应 account.accountID
      userID           TEXT NOT NULL,
      role             TEXT NOT NULL,
      start_time       TEXT NOT NULL,           -- e.g. "DD/M/YYYY 上午/下午 hh:mm:ss"
      step_correctness TEXT,                    -- JSON 数组文本
      step_points      TEXT,                    -- JSON 数组文本
      total            REAL DEFAULT 0,          -- 数值
      record_time      TEXT                     -- JSON 数组文本 [{ timestamp:..., datestring: ...}, ...]
    );
  `);

  return db;
}

function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

module.exports = { getDb };