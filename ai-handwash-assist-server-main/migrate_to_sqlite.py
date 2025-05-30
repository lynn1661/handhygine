#!/usr/bin/env python3
"""
数据迁移脚本 - 从Realm迁移到SQLite
初始化数据库并创建示例数据
"""

import os
import sys
import datetime
import bcrypt

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database_service import DatabaseService

def create_sample_data(db_service):
    """创建示例数据"""
    print("📝 创建示例数据...")
    
    # 创建示例用户
    sample_users = [
        {
            'accountSerialNumber': 'user001',
            'name': '张三',
            'email': 'zhangsan@example.com',
            'password': bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'deviceId': 'device001',
            'totalSessions': 5,
            'bestScore': 95.0
        },
        {
            'accountSerialNumber': 'user002',
            'name': '李四',
            'email': 'lisi@example.com',
            'password': bcrypt.hashpw('password456'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'deviceId': 'device002',
            'totalSessions': 3,
            'bestScore': 88.5
        },
        {
            'accountSerialNumber': 'anonymous001',
            'name': '匿名用户',
            'email': None,
            'password': None,
            'deviceId': 'device003',
            'totalSessions': 2,
            'bestScore': 76.0
        }
    ]
    
    created_users = []
    for user_data in sample_users:
        try:
            user = db_service.create_user(user_data)
            created_users.append(user)
            print(f"  ✅ 创建用户: {user_data['accountSerialNumber']}")
        except Exception as e:
            print(f"  ❌ 创建用户失败 {user_data['accountSerialNumber']}: {e}")
    
    # 创建示例评分记录
    sample_ratings = [
        {
            'userId': 'user001',
            'rating': 'PERFECT',
            'points': 100,
            'step': 'step_6',
            'sessionId': 'session001',
            'detectionAccuracy': 0.95,
            'completionTime': 30
        },
        {
            'userId': 'user001',
            'rating': 'GOOD',
            'points': 85,
            'step': 'step_5',
            'sessionId': 'session002',
            'detectionAccuracy': 0.88,
            'completionTime': 35
        },
        {
            'userId': 'user002',
            'rating': 'GOOD',
            'points': 88,
            'step': 'step_6',
            'sessionId': 'session003',
            'detectionAccuracy': 0.91,
            'completionTime': 28
        },
        {
            'userId': 'anonymous001',
            'rating': 'Need Improvement',
            'points': 65,
            'step': 'step_4',
            'sessionId': 'session004',
            'detectionAccuracy': 0.75,
            'completionTime': 45
        }
    ]
    
    created_ratings = []
    for rating_data in sample_ratings:
        try:
            rating = db_service.create_rating(rating_data)
            created_ratings.append(rating)
            print(f"  ✅ 创建评分: {rating_data['userId']} - {rating_data['rating']}")
        except Exception as e:
            print(f"  ❌ 创建评分失败: {e}")
    
    # 创建示例设备记录
    sample_devices = [
        {
            'deviceId': 'device001',
            'deviceName': 'iPad Pro',
            'deviceType': 'tablet',
            'osVersion': 'iOS 17.0',
            'appVersion': '1.0.0'
        },
        {
            'deviceId': 'device002',
            'deviceName': 'Android Tablet',
            'deviceType': 'tablet',
            'osVersion': 'Android 13',
            'appVersion': '1.0.0'
        },
        {
            'deviceId': 'device003',
            'deviceName': 'Unknown Device',
            'deviceType': 'unknown',
            'osVersion': 'unknown',
            'appVersion': '1.0.0'
        }
    ]
    
    for device_data in sample_devices:
        try:
            db_service.create_device(device_data)
            print(f"  ✅ 创建设备: {device_data['deviceId']}")
        except Exception as e:
            print(f"  ❌ 创建设备失败: {e}")
    
    # 创建示例日志
    db_service.create_log('info', '数据库初始化完成', {
        'usersCreated': len(created_users),
        'ratingsCreated': len(created_ratings),
        'timestamp': datetime.datetime.now().isoformat()
    })
    
    return len(created_users), len(created_ratings)

def main():
    """主函数"""
    print("🚀 开始SQLite数据库迁移...")
    print("=" * 50)
    
    # 数据库文件路径
    db_path = './data/handwash.db'
    
    # 确保数据目录存在
    os.makedirs('./data', exist_ok=True)
    
    try:
        # 初始化数据库服务
        print("🗄️ 初始化SQLite数据库...")
        db_service = DatabaseService(db_path)
        db_service.init_database()
        print("✅ 数据库表结构创建完成")
        
        # 创建示例数据
        users_count, ratings_count = create_sample_data(db_service)
        
        # 获取数据库统计信息
        stats = db_service.get_stats()
        
        print("=" * 50)
        print("✅ 数据迁移完成！")
        print(f"📊 统计信息:")
        print(f"  - 用户数量: {stats['userCount']}")
        print(f"  - 评分记录: {stats['ratingCount']}")
        print(f"  - 设备数量: {stats['deviceCount']}")
        print(f"  - 数据库大小: {stats['databaseSize']}")
        print(f"  - 数据库文件: {os.path.abspath(db_path)}")
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 