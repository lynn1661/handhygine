# Kaggle模型集成指南

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
curl -X POST http://localhost:8000/api/handwash/analyze \
  -H "Content-Type: application/json" \
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
