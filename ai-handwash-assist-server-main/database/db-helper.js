// 数据库帮助器，用于在API中提供统一的数据库接口
// 替换原来的 datap.mongo 调用

function getDB() {
    if (global.sqliteDB) {
        return global.sqliteDB;
    }
    throw new Error('SQLite数据库未初始化');
}

// 提供与原MongoDB接口兼容的API
const datap = {
    sqlite: {
        // 兼容 datap.mongo.read
        read: async (collection, query = {}) => {
            const db = getDB();
            return await db.read(collection, query);
        },
        
        // 兼容 datap.mongo.readid2  
        readid2: async (collection, id) => {
            const db = getDB();
            return await db.readid2(collection, id);
        },
        
        // 兼容 datap.mongo.create
        create: async (collection, data) => {
            const db = getDB();
            return await db.create(collection, data);
        },
        
        // 兼容 datap.mongo.update
        update: async (collection, query, updateData) => {
            const db = getDB();
            return await db.update(collection, query, updateData);
        },
        
        // 兼容 datap.mongo.delete
        delete: async (collection, query) => {
            const db = getDB();
            return await db.delete(collection, query);
        },
        
        // 获取排名数据
        getRankings: async (collection, limit = 10) => {
            const db = getDB();
            return await db.getRankings(collection, limit);
        }
    }
};

// 为了向后兼容，创建一个mongo别名指向sqlite
datap.mongo = datap.sqlite;

module.exports = {
    datap,
    getDB
}; 