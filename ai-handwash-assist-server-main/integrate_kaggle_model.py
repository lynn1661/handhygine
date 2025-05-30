#!/usr/bin/env python3
"""
Kaggle模型集成脚本

这个脚本帮助将原始的kaggle_get_one_prediction.py模型文件
集成到现有的Flask REST API架构中。
"""

import os
import shutil
import argparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def integrate_kaggle_model(kaggle_file_path: str, target_dir: str = "./"):
    """
    集成Kaggle模型文件到Flask架构中
    
    Args:
        kaggle_file_path: 原始kaggle_get_one_prediction.py文件的路径
        target_dir: 目标目录（Flask项目根目录）
    """
    
    # 检查源文件是否存在
    if not os.path.exists(kaggle_file_path):
        logger.error(f"源文件不存在: {kaggle_file_path}")
        return False
    
    try:
        # 1. 创建备份目录
        backup_dir = os.path.join(target_dir, "original_models")
        os.makedirs(backup_dir, exist_ok=True)
        
        # 2. 复制原始文件到备份目录
        backup_path = os.path.join(backup_dir, "kaggle_get_one_prediction.py")
        shutil.copy2(kaggle_file_path, backup_path)
        logger.info(f"原始文件已备份到: {backup_path}")
        
        # 3. 检查processor目录是否存在
        processor_dir = os.path.join(target_dir, "processor")
        if not os.path.exists(processor_dir):
            os.makedirs(processor_dir, exist_ok=True)
            logger.info(f"创建processor目录: {processor_dir}")
        
        # 4. 创建集成说明文档
        integration_guide = os.path.join(target_dir, "KAGGLE_MODEL_INTEGRATION.md")
        with open(integration_guide, 'w', encoding='utf-8') as f:
            f.write(create_integration_guide())
        
        logger.info(f"集成指南已创建: {integration_guide}")
        
        # 5. 创建原始模型的适配器
        adapter_path = os.path.join(processor_dir, "kaggle_adapter.py")
        with open(adapter_path, 'w', encoding='utf-8') as f:
            f.write(create_kaggle_adapter())
        
        logger.info(f"Kaggle适配器已创建: {adapter_path}")
        
        logger.info("✅ Kaggle模型集成完成！")
        logger.info("现在您可以：")
        logger.info("1. 查看 KAGGLE_MODEL_INTEGRATION.md 了解详细集成步骤")
        logger.info("2. 根据需要修改 processor/kaggle_adapter.py")
        logger.info("3. 在 processor/recognition.py 中引用真实模型")
        
        return True
        
    except Exception as e:
        logger.error(f"集成过程中出错: {e}")
        return False

def create_integration_guide():
    """创建集成指南内容"""
    return """# Kaggle模型集成指南

## 概述

这个指南帮助您将原始的 `kaggle_get_one_prediction.py` 模型集成到Flask REST API架构中。

## 文件结构

```
ai-handwash-assist-server-main/
├── processor/
│   ├── __init__.py                 # 模块初始化
│   ├── recognition.py              # 主要识别处理器
│   └── kaggle_adapter.py           # Kaggle模型适配器
├── original_models/
│   └── kaggle_get_one_prediction.py # 原始模型备份
├── services/
│   └── handwash_detection_service.py # Flask服务集成
└── app.py                          # Flask主应用
```

## 集成步骤

### 1. 原始模型分析

原始的 `kaggle_get_one_prediction.py` 使用了：
- Socket.IO异步通信
- aiohttp web框架
- 模型池管理
- 异步处理

### 2. Flask适配的主要变化

1. **通信方式**: Socket.IO → REST API
2. **框架**: aiohttp → Flask
3. **处理模式**: 异步 → 同步
4. **模型池**: 保持，但适配同步模式

### 3. 核心组件映射

| 原始组件 | Flask适配组件 | 功能 |
|----------|---------------|------|
| ModelPool | ModelPool | 模型池管理 |
| get_hand_key_point | get_hand_key_point | 关键点处理 |
| split_and_prep_frame | split_and_prep_frame | 数据预处理 |
| map_result_to_step | map_result_to_step | 结果映射 |
| process_data (异步) | process_data_sync (同步) | 数据处理 |

### 4. 使用真实模型

如果您想使用真实的AI模型，请：

1. 将模型文件放置在 `processor/` 目录下
2. 修改 `processor/recognition.py` 中的 `_load_model` 方法
3. 更新 `_simulate_inference` 为实际的模型推理

```python
# 在 processor/recognition.py 中
def _load_model(self):
    try:
        # 加载您的实际模型
        import your_model_module
        self.model = your_model_module.load_model()
        self.model_loaded = True
        logger.info("实际模型加载完成")
    except Exception as e:
        logger.error(f"模型加载失败: {e}")
        self.model_loaded = False

def _simulate_inference(self, keypoints):
    # 使用实际模型推理
    if self.model_loaded:
        return self.model.predict(keypoints)
    else:
        return self._generate_single_default_result()
```

### 5. 测试集成

```bash
# 启动Flask服务器
python app.py

# 测试洗手检测API
curl -X POST http://localhost:8000/api/handwash/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": [{"left": [{"keypoints": [...], "score": 0.9}]}],
    "step": 1,
    "requestId": "test_123"
  }'
```

### 6. 性能优化

1. **模型池大小**: 根据服务器资源调整
2. **线程池**: 根据并发需求调整
3. **缓存**: 对重复请求使用缓存
4. **异步处理**: 如需要可考虑使用Celery

## API接口

### 洗手分析接口
- **URL**: `/api/handwash/analyze`
- **方法**: POST
- **输入格式**: 与原Socket.IO格式兼容
- **输出格式**: JSON响应

### 健康检查接口
- **URL**: `/api/handwash/health`
- **方法**: GET
- **返回**: 模型池状态和系统健康信息

### 统计信息接口
- **URL**: `/api/handwash/stats`
- **方法**: GET
- **返回**: 详细的系统统计信息

## 故障排除

1. **模型加载失败**: 检查模型文件路径和依赖
2. **内存不足**: 减少模型池大小
3. **处理超时**: 调整超时配置
4. **API格式错误**: 确保输入数据格式正确

## 下一步

1. 根据实际需求调整模型池配置
2. 集成真实的AI模型文件
3. 添加更多的监控和日志
4. 考虑添加缓存机制
5. 优化性能和资源使用

---

📧 如有问题，请参考 Flask 和相关模型的文档。
"""

def create_kaggle_adapter():
    """创建Kaggle模型适配器代码"""
    return '''#!/usr/bin/env python3
"""
Kaggle模型适配器

这个模块提供了原始kaggle_get_one_prediction.py模型的适配接口，
将异步Socket.IO模型适配为同步Flask REST API。
"""

import asyncio
import logging
from typing import Dict, List, Any
import numpy as np

logger = logging.getLogger('KaggleAdapter')

class KaggleModelAdapter:
    """
    Kaggle模型适配器
    
    将原始的异步Socket.IO模型适配为同步Flask API模式
    """
    
    def __init__(self):
        self.original_model = None
        self.loop = None
        
    def load_original_model(self):
        """
        加载原始的Kaggle模型
        
        注意：您需要根据实际情况修改这个方法
        """
        try:
            # 这里导入原始模型
            # from original_models.kaggle_get_one_prediction import ModelPool, process_data
            # self.original_model = ModelPool(size=2)
            
            logger.info("原始Kaggle模型加载成功（请实现具体逻辑）")
            return True
            
        except Exception as e:
            logger.error(f"原始模型加载失败: {e}")
            return False
    
    def sync_process_data(self, data: List, step: int, request_id: str = None) -> Dict:
        """
        同步处理数据（将异步调用转换为同步）
        
        Args:
            data: 输入数据
            step: 当前步骤
            request_id: 请求ID
            
        Returns:
            处理结果字典
        """
        try:
            if self.original_model is None:
                return self._mock_result(step, request_id)
            
            # 将异步调用转换为同步
            # 注意：这需要根据原始模型的具体实现来调整
            result = self._run_async_in_sync(data, step, request_id)
            
            return result
            
        except Exception as e:
            logger.error(f"同步处理失败: {e}")
            return {
                "error": str(e),
                "requestId": request_id,
                "step": step
            }
    
    def _run_async_in_sync(self, data: List, step: int, request_id: str) -> Dict:
        """
        在同步环境中运行异步代码
        """
        try:
            # 创建新的事件循环（如果需要）
            if self.loop is None or self.loop.is_closed():
                self.loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.loop)
            
            # 运行异步处理函数
            # result = self.loop.run_until_complete(
            #     self._async_process(data, step, request_id)
            # )
            
            # 目前返回模拟结果
            result = self._mock_result(step, request_id)
            
            return result
            
        except Exception as e:
            logger.error(f"异步转同步失败: {e}")
            return self._mock_result(step, request_id, error=str(e))
    
    async def _async_process(self, data: List, step: int, request_id: str) -> Dict:
        """
        异步处理函数（需要根据原始模型实现）
        """
        # 这里调用原始的异步处理函数
        # result = await original_process_data(data, step, request_id)
        # return result
        
        # 目前返回模拟结果
        return self._mock_result(step, request_id)
    
    def _mock_result(self, step: int, request_id: str, error: str = None) -> Dict:
        """生成模拟结果"""
        if error:
            return {
                "error": error,
                "requestId": request_id,
                "step": step
            }
        
        return {
            "ans": "True",
            "step": step,
            "requestId": request_id,
            "probability": 0.85,
            "threshold": 1.0,
            "adapted": True,
            "note": "这是适配器的模拟结果，请实现真实模型逻辑"
        }
    
    def get_adapter_info(self) -> Dict:
        """获取适配器信息"""
        return {
            "adapter_version": "1.0.0",
            "original_model_loaded": self.original_model is not None,
            "status": "ready",
            "note": "Kaggle模型适配器"
        }
    
    def shutdown(self):
        """关闭适配器"""
        if self.loop and not self.loop.is_closed():
            self.loop.close()
        
        if self.original_model:
            # 清理原始模型资源
            pass
        
        logger.info("Kaggle模型适配器已关闭")

# 全局适配器实例
kaggle_adapter = KaggleModelAdapter()
'''

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='集成Kaggle模型到Flask架构')
    parser.add_argument('kaggle_file', help='kaggle_get_one_prediction.py文件路径')
    parser.add_argument('--target-dir', default='./', help='目标目录（默认当前目录）')
    
    args = parser.parse_args()
    
    success = integrate_kaggle_model(args.kaggle_file, args.target_dir)
    
    if success:
        print("✅ 集成完成！请查看 KAGGLE_MODEL_INTEGRATION.md 了解后续步骤。")
    else:
        print("❌ 集成失败，请检查错误信息。")

if __name__ == '__main__':
    main() 