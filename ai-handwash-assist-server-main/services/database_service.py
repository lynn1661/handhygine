import sqlite3
import datetime
import uuid
import os
import threading
from contextlib import contextmanager

class DatabaseService:
    """SQLite数据库服务类"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self.lock = threading.Lock()
        
        # 确保数据目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    @contextmanager
    def get_connection(self):
        """获取数据库连接的上下文管理器"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # 允许按列名访问
            try:
                yield conn
            finally:
                conn.close()
    
    def init_database(self):
        """初始化数据库表结构"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 用户表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_serial_number TEXT UNIQUE NOT NULL,
                    name TEXT,
                    email TEXT,
                    password TEXT,
                    device_id TEXT,
                    total_sessions INTEGER DEFAULT 0,
                    best_score REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_sync_at TIMESTAMP
                )
            ''')
            
            # 评分表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ratings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    rating TEXT NOT NULL,
                    points REAL NOT NULL,
                    step TEXT,
                    step_video_file TEXT,
                    session_id TEXT,
                    detection_accuracy REAL,
                    completion_time INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (account_serial_number)
                )
            ''')
            
            # 设备表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id TEXT UNIQUE NOT NULL,
                    device_name TEXT,
                    device_type TEXT,
                    os_version TEXT,
                    app_version TEXT,
                    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 日志表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 性能指标表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    session_id TEXT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 创建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_account_serial ON users(account_serial_number)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)')
            
            conn.commit()
    
    # 用户相关操作
    def create_user(self, user_data):
        """创建用户"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO users (account_serial_number, name, email, password, device_id, total_sessions, best_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_data.get('accountSerialNumber'),
                user_data.get('name'),
                user_data.get('email'),
                user_data.get('password'),
                user_data.get('deviceId'),
                user_data.get('totalSessions', 0),
                user_data.get('bestScore', 0.0)
            ))
            
            conn.commit()
            return self.find_user(user_data.get('accountSerialNumber'))
    
    def find_user(self, account_serial_number):
        """查找用户"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE account_serial_number = ?', (account_serial_number,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_user(self, account_serial_number, update_data):
        """更新用户信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 构建动态更新语句
            set_clause = []
            values = []
            
            for key, value in update_data.items():
                if key == 'accountSerialNumber':
                    set_clause.append('account_serial_number = ?')
                elif key == 'totalSessions':
                    set_clause.append('total_sessions = ?')
                elif key == 'bestScore':
                    set_clause.append('best_score = ?')
                elif key == 'deviceId':
                    set_clause.append('device_id = ?')
                elif key == 'lastSyncAt':
                    set_clause.append('last_sync_at = ?')
                else:
                    set_clause.append(f'{key} = ?')
                values.append(value)
            
            set_clause.append('updated_at = CURRENT_TIMESTAMP')
            values.append(account_serial_number)
            
            cursor.execute(f'''
                UPDATE users SET {', '.join(set_clause)}
                WHERE account_serial_number = ?
            ''', values)
            
            conn.commit()
            return self.find_user(account_serial_number)
    
    def get_user_rankings(self, limit=10):
        """获取用户排名"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM users 
                ORDER BY best_score DESC, total_sessions DESC
                LIMIT ?
            ''', (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # 评分相关操作
    def create_rating(self, rating_data):
        """创建评分记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO ratings (user_id, rating, points, step, step_video_file, session_id, detection_accuracy, completion_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rating_data.get('userId'),
                rating_data.get('rating'),
                rating_data.get('points'),
                rating_data.get('step'),
                rating_data.get('stepVideoFile'),
                rating_data.get('sessionId'),
                rating_data.get('detectionAccuracy'),
                rating_data.get('completionTime')
            ))
            
            rating_id = cursor.lastrowid
            conn.commit()
            
            # 返回创建的记录
            cursor.execute('SELECT * FROM ratings WHERE id = ?', (rating_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_ratings_by_user(self, user_id, limit=10):
        """获取用户的评分历史"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM ratings 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (user_id, limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # 设备相关操作
    def create_device(self, device_data):
        """创建设备记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO devices (device_id, device_name, device_type, os_version, app_version)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                device_data.get('deviceId'),
                device_data.get('deviceName'),
                device_data.get('deviceType'),
                device_data.get('osVersion'),
                device_data.get('appVersion')
            ))
            
            conn.commit()
    
    # 日志相关操作
    def create_log(self, level, message, metadata=None):
        """创建日志记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            metadata_str = str(metadata) if metadata else None
            
            cursor.execute('''
                INSERT INTO logs (level, message, metadata)
                VALUES (?, ?, ?)
            ''', (level, message, metadata_str))
            
            conn.commit()
    
    # 统计信息
    def get_stats(self):
        """获取数据库统计信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 用户统计
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            
            # 评分统计
            cursor.execute('SELECT COUNT(*) FROM ratings')
            rating_count = cursor.fetchone()[0]
            
            # 设备统计
            cursor.execute('SELECT COUNT(*) FROM devices')
            device_count = cursor.fetchone()[0]
            
            # 数据库大小
            cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
            db_size = cursor.fetchone()[0]
            
            return {
                'userCount': user_count,
                'ratingCount': rating_count,
                'deviceCount': device_count,
                'databaseSize': f"{db_size / (1024*1024):.2f} MB" if db_size else "0 MB",
                'lastUpdated': datetime.datetime.now().isoformat()
            }
    
    def cleanup_old_data(self, days=30):
        """清理旧数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
            
            # 清理旧的日志记录
            cursor.execute('DELETE FROM logs WHERE created_at < ?', (cutoff_date,))
            
            # 清理旧的评分记录（保留最近的记录）
            cursor.execute('''
                DELETE FROM ratings 
                WHERE created_at < ? 
                AND id NOT IN (
                    SELECT id FROM ratings 
                    WHERE user_id = ratings.user_id
                    ORDER BY created_at DESC 
                    LIMIT 10
                )
            ''', (cutoff_date,))
            
            conn.commit() 