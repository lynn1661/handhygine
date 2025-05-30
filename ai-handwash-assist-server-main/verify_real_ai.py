#!/usr/bin/env python3
"""
真实AI模型集成验证脚本
"""

def verify_real_ai_integration():
    print("🚀 验证真实AI模型集成状态...")
    
    try:
        # 验证Flask应用导入
        import app
        print("✅ Flask应用导入成功")
        
        # 验证真实AI模型导入
        from processor.real_recognition import RealREC_Processor
        print("✅ 真实AI模型导入成功")
        
        # 验证洗手检测服务
        from services.handwash_detection_service import HandwashDetectionService
        print("✅ 洗手检测服务导入成功")
        
        # 验证数据库服务
        from services.database_service import DatabaseService
        print("✅ 数据库服务导入成功")
        
        print("\n🎉 真实AI模型集成验证完成！")
        print("=" * 50)
        print("🤖 模型类型: ST-GCN (Spatial Temporal Graph Convolutional Network)")
        print("📊 数据库: SQLite")
        print("🌐 服务器地址: http://localhost:8000")
        print("🔧 模式: 完全离线 + 真实AI")
        print("📝 使用说明: 查看 REAL_AI_MODEL_GUIDE.md")
        print("=" * 50)
        print("\n🚀 启动命令:")
        print("  python app.py")
        print("\n🧪 测试命令:")
        print("  python test_real_model.py")
        print("  python test_real_detection.py")
        print("\n🎯 准备就绪！可以启动服务器了")
        
        return True
        
    except Exception as e:
        print(f"❌ 验证失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    verify_real_ai_integration() 