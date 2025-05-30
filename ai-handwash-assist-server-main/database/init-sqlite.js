const SQLiteAdapter = require('./sqlite-adapter');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
    console.log('🚀 开始初始化SQLite数据库...');
    
    const db = new SQLiteAdapter();
    
    try {
        // 等待数据库初始化完成
        await db.init();
        
        console.log('📋 创建示例数据...');
        
        // 创建默认管理员用户
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = {
            accountID: 'admin',
            accountSerialNumber: 'ADMIN_001',
            password: hashedPassword,
            name: '管理员',
            email: 'admin@handwash.local',
            totalSessions: 0,
            bestScore: 0
        };
        
        try {
            await db.create('account', adminUser);
            console.log('✅ 管理员用户创建成功: admin / admin123');
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log('ℹ️  管理员用户已存在');
            } else {
                throw error;
            }
        }
        
        // 创建示例普通用户
        const testUser = {
            accountID: 'user001',
            accountSerialNumber: 'USER_001',
            password: await bcrypt.hash('test123', 10),
            name: '测试用户',
            email: 'test@handwash.local',
            totalSessions: 5,
            bestScore: 85.5
        };
        
        try {
            await db.create('account', testUser);
            console.log('✅ 测试用户创建成功: user001 / test123');
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log('ℹ️  测试用户已存在');
            } else {
                throw error;
            }
        }
        
        // 创建示例评分记录
        const sampleRating = {
            userId: 'USER_001',
            rating: 'excellent',
            points: 95.5,
            step_video_file: null
        };
        
        await db.create('rating', sampleRating);
        console.log('✅ 示例评分记录创建成功');
        
        // 创建示例洗手记录
        const sampleRecord = {
            userId: 'USER_001',
            sessionData: JSON.stringify({
                steps: ['step1', 'step2', 'step3'],
                timestamps: [0, 30, 60, 90]
            }),
            score: 85.5,
            duration: 90,
            steps: JSON.stringify(['palms', 'back_of_hands', 'between_fingers'])
        };
        
        await db.create('record', sampleRecord);
        console.log('✅ 示例洗手记录创建成功');
        
        // 创建示例性能指标
        const sampleMetrics = {
            userId: 'USER_001',
            sessionId: 'session_001',
            jitterReduction: 0.85,
            occlusionPredictionAccuracy: 0.92,
            occlusionSmoothness: 0.78,
            trajectoryMatchRate: 0.88,
            frameRate: 30.0,
            keyPointDetectionData: JSON.stringify({ accuracy: 0.95 }),
            stepAccuracyData: JSON.stringify({ step1: 0.9, step2: 0.8, step3: 0.95 })
        };
        
        await db.create('performance_metrics', sampleMetrics);
        console.log('✅ 示例性能指标创建成功');
        
        console.log('🎉 SQLite数据库初始化完成!');
        console.log('📁 数据库文件位置:', db.dbPath);
        
        // 验证数据
        const userCount = await db.read('account');
        console.log(`📊 数据库统计: ${userCount.length} 个用户`);
        
        db.close();
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        db.close();
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase; 