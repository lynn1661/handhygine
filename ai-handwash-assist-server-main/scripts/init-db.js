// MongoDB数据库初始化脚本
const { MongoClient } = require('mongodb');

const DATABASE_URL = 'mongodb://localhost:27017';
const DATABASE_NAME = 'Polyuhandhygiene';

async function initializeDatabase() {
    const client = new MongoClient(DATABASE_URL);
    
    try {
        console.log('连接到MongoDB...');
        await client.connect();
        
        const db = client.db(DATABASE_NAME);
        
        // 创建用户集合和索引
        console.log('创建用户集合...');
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ accountSerialNumber: 1 }, { unique: true });
        await usersCollection.createIndex({ createdAt: 1 });
        
        // 创建评分集合和索引
        console.log('创建评分集合...');
        const ratingsCollection = db.collection('ratings');
        await ratingsCollection.createIndex({ userId: 1 });
        await ratingsCollection.createIndex({ step: 1 });
        await ratingsCollection.createIndex({ createdAt: 1 });
        
        // 创建性能指标集合和索引
        console.log('创建性能指标集合...');
        const performanceCollection = db.collection('performance_metrics');
        await performanceCollection.createIndex({ userId: 1 });
        await performanceCollection.createIndex({ sessionId: 1 });
        await performanceCollection.createIndex({ createdAt: 1 });
        
        // 创建日志集合和索引
        console.log('创建日志集合...');
        const logsCollection = db.collection('logs');
        await logsCollection.createIndex({ level: 1 });
        await logsCollection.createIndex({ timestamp: 1 });
        
        // 插入一些示例数据（可选）
        console.log('插入示例数据...');
        
        // 示例用户数据
        const sampleUser = {
            accountSerialNumber: 'DEMO001',
            name: '演示用户',
            email: 'demo@example.com',
            createdAt: new Date(),
            totalSessions: 0,
            bestScore: 0
        };
        
        try {
            await usersCollection.insertOne(sampleUser);
            console.log('插入示例用户成功');
        } catch (err) {
            if (err.code === 11000) {
                console.log('示例用户已存在，跳过插入');
            } else {
                throw err;
            }
        }
        
        console.log('数据库初始化完成！');
        
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase }; 