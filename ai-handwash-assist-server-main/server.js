const server = require('micro-server');
const SQLiteAdapter = require('./database/sqlite-adapter');

// 全局SQLite数据库实例
let sqliteDB = null;

// 启动服务器前初始化SQLite
async function startServer() {
    try {
        console.log('🚀 启动洗手检测服务器 (SQLite版本)...');
        
        // 初始化SQLite数据库
        sqliteDB = new SQLiteAdapter();
        await sqliteDB.init();
        
        // 将SQLite实例添加到全局可访问的地方
        global.sqliteDB = sqliteDB;
        
        // 启动服务器
        server.start({
            projectDir: __dirname,
            // 添加SQLite数据库到服务器上下文
            beforeStart: () => {
                console.log('✅ SQLite数据库已准备就绪');
            }
        });
        
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        if (sqliteDB) {
            sqliteDB.close();
        }
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 收到关闭信号，正在关闭服务器...');
    if (sqliteDB) {
        sqliteDB.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 收到终止信号，正在关闭服务器...');
    if (sqliteDB) {
        sqliteDB.close();
    }
    process.exit(0);
});

// 启动服务器
startServer();


