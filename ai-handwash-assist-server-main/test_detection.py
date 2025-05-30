#!/usr/bin/env python3
"""
洗手检测服务测试脚本
"""

from services.handwash_detection_service import HandwashDetectionService
from services.database_service import DatabaseService

def test_handwash_detection():
    print("🧪 开始测试洗手检测服务...")
    
    try:
        # 初始化服务
        db_service = DatabaseService('./data/handwash.db')
        handwash_service = HandwashDetectionService(db_service)
        
        # 测试数据（模拟MediaPipe的关键点数据）
        test_data = [{
            'left': [{
                'keypoints': [
                    {'x': 0.1 + i*0.01, 'y': 0.2 + i*0.01, 'z': 0.3 + i*0.01} 
                    for i in range(21)
                ],
                'score': 0.9
            }],
            'right': [{
                'keypoints': [
                    {'x': 0.5 + i*0.01, 'y': 0.6 + i*0.01, 'z': 0.7 + i*0.01} 
                    for i in range(21)
                ],
                'score': 0.8
            }]
        }]
        
        print("📊 测试不同步骤的洗手检测...")
        
        # 测试所有7个步骤
        for step in range(1, 8):
            result = handwash_service.analyze_handwash(
                data=test_data,
                step=step,
                request_id=f'test_step_{step}'
            )
            
            print(f"  步骤 {step}:")
            print(f"    ✅ 结果: {result['ans']}")
            print(f"    📈 概率: {result['probability']:.3f}")
            print(f"    ⏱️  处理时间: {result['processingTime']:.3f}秒")
            print(f"    🆔 请求ID: {result['requestId']}")
            
            if 'simulation' in result:
                print(f"    🎭 模拟模式: {result['simulation']}")
            
            print()
        
        # 测试统计信息
        print("📈 获取系统统计信息...")
        stats = handwash_service.get_detection_stats()
        print(f"  模型池大小: {stats['modelPool']['size']}")
        print(f"  可用处理器: {stats['modelPool']['available']}")
        print(f"  使用中处理器: {stats['modelPool']['inUse']}")
        print(f"  系统状态: {stats['status']}")
        
        print("✅ 所有测试通过！洗手检测服务运行正常。")
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_handwash_detection()
    exit(0 if success else 1) 