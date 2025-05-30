#!/usr/bin/env python3
"""
真实AI模型测试脚本
"""

from processor.real_recognition import RealREC_Processor
import logging
import numpy as np

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_real_model():
    print("🚀 开始测试真实AI模型...")
    
    try:
        # 初始化真实AI模型
        print("📦 初始化真实AI模型处理器...")
        processor = RealREC_Processor()
        
        # 获取模型信息
        model_info = processor.get_model_info()
        print("📊 模型信息:")
        for key, value in model_info.items():
            print(f"  {key}: {value}")
        
        if not model_info['model_loaded']:
            print("⚠️ 模型未成功加载，但处理器已创建")
            return False
        
        # 创建测试数据
        print("🧪 创建测试数据...")
        # 模拟关键点数据：(batch_size, channels, frames, joints, persons)
        # 这里使用 (1, 3, 42, 42, 1) 的形状，符合ST-GCN的输入要求
        test_data = np.random.rand(1, 3, 42, 42, 1).astype(np.float32)
        print(f"  测试数据形状: {test_data.shape}")
        
        # 进行推理
        print("🔮 开始推理...")
        result = processor.start([test_data])
        
        print("✅ 推理完成!")
        print(f"  结果数量: {len(result)}")
        if result:
            print(f"  第一个结果形状: {result[0].shape}")
            print(f"  第一个结果内容: {result[0]}")
        
        # 重置处理器
        processor.reset()
        print("🔄 处理器已重置")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_real_model()
    if success:
        print("🎉 真实AI模型测试成功！")
    else:
        print("💥 真实AI模型测试失败！")
    exit(0 if success else 1) 