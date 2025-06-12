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

  // 创建 user_info 表（如果不存在）
  // 简化版本，不需要账户系统，每次训练都是独立的记录
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_info (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      role             TEXT NOT NULL,           -- 用户角色（Doctor, Nurse, Student等）
      start_time       TEXT NOT NULL,           -- 开始时间 e.g. "DD/M/YYYY 上午/下午 hh:mm:ss"
      step_points      TEXT,                    -- JSON 数组文本
      total            REAL DEFAULT 0,          -- 原始总分数值
      mapped_total     REAL DEFAULT 0,          -- 映射后的总分数值
      record_time      TEXT                     -- JSON 数组文本 [{ timestamp:..., datestring: ...}, ...]
    );
  `);

  // 为现有数据添加 mapped_total 字段（如果不存在）
  try {
    await db.exec(`ALTER TABLE user_info ADD COLUMN mapped_total REAL DEFAULT 0;`);
    console.log('✅ 已添加 mapped_total 字段');
  } catch (error) {
    // 字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ 添加 mapped_total 字段时出现问题:', error.message);
    }
  }

  // 检查并提示删除不需要的字段
  try {
    const tableInfo = await db.all(`PRAGMA table_info(user_info)`);
    const hasStepCorrectness = tableInfo.some(col => col.name === 'step_correctness');
    const hasAccountID = tableInfo.some(col => col.name === 'accountID');
    const hasUserID = tableInfo.some(col => col.name === 'userID');
    
    if (hasStepCorrectness || hasAccountID || hasUserID) {
      console.log('⚠️ 检测到旧的字段，建议运行迁移脚本:');
      if (hasStepCorrectness) console.log('   - step_correctness 字段');
      if (hasAccountID) console.log('   - accountID 字段');
      if (hasUserID) console.log('   - userID 字段');
      console.log('   运行: npm run migrate:simplify-database');
    }

    // 检查是否存在account表
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='account'`);
    if (tables.length > 0) {
      console.log('⚠️ 检测到 account 表，建议运行迁移脚本删除');
    }
  } catch (error) {
    console.warn('⚠️ 检查数据库结构时出现问题:', error.message);
  }

  return db;
}

function getDb() {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

module.exports = { getDb };