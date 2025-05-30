const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SQLiteAdapter {
    constructor(dbPath = './database/handwash.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            // 确保数据库目录存在
            const fs = require('fs');
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('SQLite连接错误:', err);
                    reject(err);
                } else {
                    console.log('✅ SQLite数据库连接成功:', this.dbPath);
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // 用户表
                `CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    accountID TEXT UNIQUE NOT NULL,
                    accountSerialNumber TEXT UNIQUE,
                    password TEXT,
                    name TEXT,
                    email TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    lastModified TEXT DEFAULT CURRENT_TIMESTAMP,
                    totalSessions INTEGER DEFAULT 0,
                    bestScore REAL DEFAULT 0
                )`,
                
                // 评分表
                `CREATE TABLE IF NOT EXISTS ratings (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    rating TEXT,
                    points REAL,
                    step_video_file TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users (accountSerialNumber)
                )`,
                
                // 记录表
                `CREATE TABLE IF NOT EXISTS records (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    sessionData TEXT,
                    score REAL,
                    duration INTEGER,
                    steps TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users (accountSerialNumber)
                )`,
                
                // 性能指标表
                `CREATE TABLE IF NOT EXISTS performance_metrics (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    sessionId TEXT,
                    jitterReduction REAL,
                    occlusionPredictionAccuracy REAL,
                    occlusionSmoothness REAL,
                    trajectoryMatchRate REAL,
                    frameRate REAL,
                    keyPointDetectionData TEXT,
                    stepAccuracyData TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users (accountSerialNumber)
                )`
            ];

            let completed = 0;
            const total = tables.length;

            tables.forEach((sql) => {
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error('创建表失败:', err);
                        reject(err);
                    } else {
                        completed++;
                        if (completed === total) {
                            console.log('✅ 所有SQLite表创建完成');
                            resolve();
                        }
                    }
                });
            });
        });
    }

    // 模拟MongoDB的read操作
    async read(collection, query = {}) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            let sql = `SELECT * FROM ${table}`;
            const params = [];

            if (Object.keys(query).length > 0) {
                const conditions = Object.keys(query).map(key => {
                    params.push(query[key]);
                    return `${key} = ?`;
                });
                sql += ` WHERE ${conditions.join(' AND ')}`;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // 为每个结果添加_id字段以兼容MongoDB格式
                    const results = rows.map(row => ({ ...row, _id: row.id }));
                    resolve(results);
                }
            });
        });
    }

    // 模拟MongoDB的readid2操作（通过ID查找）
    async readid2(collection, id) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            const sql = `SELECT * FROM ${table} WHERE accountSerialNumber = ? OR id = ?`;
            
            this.db.get(sql, [id, id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        resolve({ ...row, _id: row.id });
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    // 模拟MongoDB的create操作
    async create(collection, data) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            const id = data.id || uuidv4();
            const dataWithId = { ...data, id, createdAt: new Date().toISOString() };
            
            const columns = Object.keys(dataWithId);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => {
                // 处理对象和数组，转换为JSON字符串
                const value = dataWithId[col];
                return typeof value === 'object' ? JSON.stringify(value) : value;
            });

            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ ...dataWithId, _id: id });
                }
            });
        });
    }

    // 模拟MongoDB的update操作
    async update(collection, query, updateData) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.keys(updateData).map(key => {
                const value = updateData[key];
                return typeof value === 'object' ? JSON.stringify(value) : value;
            });

            let sql = `UPDATE ${table} SET ${updateFields}, lastModified = ?`;
            const params = [...updateValues, new Date().toISOString()];

            if (Object.keys(query).length > 0) {
                const conditions = Object.keys(query).map(key => {
                    params.push(query[key]);
                    return `${key} = ?`;
                });
                sql += ` WHERE ${conditions.join(' AND ')}`;
            }

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ modifiedCount: this.changes });
                }
            });
        });
    }

    // 模拟MongoDB的delete操作
    async delete(collection, query) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            let sql = `DELETE FROM ${table}`;
            const params = [];

            if (Object.keys(query).length > 0) {
                const conditions = Object.keys(query).map(key => {
                    params.push(query[key]);
                    return `${key} = ?`;
                });
                sql += ` WHERE ${conditions.join(' AND ')}`;
            }

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deletedCount: this.changes });
                }
            });
        });
    }

    // 获取排名数据
    async getRankings(collection, limit = 10) {
        return new Promise((resolve, reject) => {
            const table = this.getTableName(collection);
            let sql;
            
            if (collection === 'user_info') {
                sql = `SELECT accountSerialNumber, bestScore, name FROM ${table} 
                       ORDER BY bestScore DESC LIMIT ?`;
            } else {
                sql = `SELECT * FROM ${table} ORDER BY points DESC LIMIT ?`;
            }

            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('SQLite关闭错误:', err);
                } else {
                    console.log('SQLite数据库连接已关闭');
                }
            });
        }
    }

    // 表名映射
    getTableName(collection) {
        const mapping = {
            'account': 'users',
            'user_info': 'users',
            'rating': 'ratings',
            'record': 'records',
            'performance_metrics': 'performance_metrics'
        };
        return mapping[collection] || collection;
    }
}

module.exports = SQLiteAdapter; 