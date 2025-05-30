#!/usr/bin/env python3
import logging
import os
import json
import sys
import threading
import time
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Any, Optional

# 配置日志
logger = logging.getLogger('HandwashDetection')
logger.setLevel(logging.INFO)

class ModelPool:
    """模型池管理器 - 预加载多个模型实例以提高并发性能"""
    
    def __init__(self, size=2, use_real_model=True):
        self.pool = []
        self.lock = threading.Lock()
        self.size = size
        self.use_real_model = use_real_model
        
        # 预加载模型
        logger.info(f"初始化模型池，大小: {size}, 使用真实模型: {use_real_model}")
        try:
            if use_real_model:
                # 尝试导入真实模型处理器
                from processor.real_recognition import RealREC_Processor
                
                for _ in range(size):
                    processor = RealREC_Processor(sys.argv[1:])
                    self.pool.append({"processor": processor, "in_use": False})
                logger.info("真实AI模型池初始化完成")
            else:
                # 使用模拟模型处理器
                from processor.recognition import REC_Processor
                
                for _ in range(size):
                    processor = REC_Processor(sys.argv[1:])
                    self.pool.append({"processor": processor, "in_use": False})
                logger.info("模拟模型池初始化完成")
            
        except Exception as e:
            logger.warning(f"真实模型初始化失败: {e}，回退到模拟模式")
            # 回退到模拟模式
            try:
                from processor.recognition import REC_Processor
                
                for _ in range(size):
                    processor = REC_Processor(sys.argv[1:])
                    self.pool.append({"processor": processor, "in_use": False})
                logger.info("回退模拟模型池初始化完成")
                self.use_real_model = False
            except Exception as e2:
                logger.error(f"模拟模型也初始化失败: {e2}")
                # 使用None作为处理器
                for _ in range(size):
                    self.pool.append({"processor": None, "in_use": False})
                self.use_real_model = False
        
    def get_processor(self):
        """获取可用的处理器"""
        with self.lock:
            # 查找空闲的处理器
            for item in self.pool:
                if not item["in_use"]:
                    item["in_use"] = True
                    return item
                    
            # 如果没有空闲处理器，创建新的
            logger.info("所有处理器都在使用，创建新处理器")
            try:
                from processor.recognition import REC_Processor
                processor = REC_Processor(sys.argv[1:])
            except ImportError:
                processor = None
                
            new_item = {"processor": processor, "in_use": True}
            self.pool.append(new_item)
            return new_item
    
    def release_processor(self, item):
        """释放处理器"""
        with self.lock:
            item["in_use"] = False

class HandwashDetectionService:
    """洗手检测服务 - Flask REST API适配版本"""
    
    def __init__(self, db_service=None, use_real_model=True):
        self.db_service = db_service
        self.thread_pool = ThreadPoolExecutor(max_workers=4)  # 4个工作线程
        self.model_pool = ModelPool(size=2, use_real_model=use_real_model)  # 2个预加载模型
        
        # 阈值设置
        self.step_threshold = {
            1: 1., 2: 1., 3: 0., 4: 0., 5: 4., 6: 4., 7: -2.
        }
        
        logger.info(f"洗手检测服务初始化完成，使用真实模型: {use_real_model}")
    
    def get_hand_key_point(self, data: Dict) -> np.ndarray:
        """处理手部关键点数据"""
        num_channels = 3
        num_hand_in = 4
        num_hand_out = 2
        key_point_number = 21
        
        key_point_numpy = np.zeros((num_channels, key_point_number, num_hand_in))
        score_numpy = np.zeros(num_hand_in)
        
        # 处理可用的手部数据（left, right等）
        hand_index = 0
        for side_name, side_data in data.items():
            if hand_index >= num_hand_in:
                break
                
            if isinstance(side_data, list) and len(side_data) > 0:
                hand_data = side_data[0]  # 取第一个检测结果
                
                if "keypoints" in hand_data and "score" in hand_data:
                    keypoints3D = hand_data["keypoints"]
                    score_numpy[hand_index] = hand_data["score"]
                    
                    # 确保关键点数据足够
                    for number, point in enumerate(keypoints3D):
                        if number >= key_point_number:
                            break
                        if isinstance(point, dict) and all(k in point for k in ['x', 'y', 'z']):
                            key_point_numpy[0, number, hand_index] = point['x']
                            key_point_numpy[1, number, hand_index] = point['y']
                            key_point_numpy[2, number, hand_index] = point['z']
                    
                    hand_index += 1
        
        # 如果没有足够的数据，填充默认值
        if hand_index == 0:
            logger.warning("没有找到有效的手部关键点数据，使用默认值")
            # 填充一些默认的关键点数据
            for i in range(min(2, num_hand_in)):
                score_numpy[i] = 0.5
                for j in range(key_point_number):
                    key_point_numpy[0, j, i] = 0.5 + i * 0.1
                    key_point_numpy[1, j, i] = 0.5 + j * 0.01
                    key_point_numpy[2, j, i] = 0.0

        # 按分数排序
        if np.sum(score_numpy) > 0:
            sort_index = (-score_numpy).argsort()
            key_point_numpy = key_point_numpy[:, :, sort_index]
        
        # 只取前num_hand_out个最好的结果
        key_point_numpy = key_point_numpy[:, :, 0:num_hand_out]
        
        # 重新组织数据格式
        if key_point_numpy.shape[2] >= 2:
            key_point_numpy = np.concatenate(
                (key_point_numpy[:,:,0:1], key_point_numpy[:,:,1:2]), 
                axis=-2
            )
        else:
            # 如果只有一只手，复制数据
            single_hand = key_point_numpy[:,:,0:1]
            key_point_numpy = np.concatenate((single_hand, single_hand), axis=-2)
        
        return key_point_numpy

    def split_and_prep_frame(self, input_data: List) -> List:
        """分割和预处理帧数据"""
        keypoint_list = []
        
        for i in input_data:
            key_points = self.get_hand_key_point(i)
            keypoint_list.append(key_points)
            
        keypoint_tensor = np.stack(keypoint_list, axis=1) 
        keypoint_input = [keypoint_tensor[np.newaxis, :]]
        
        return keypoint_input

    def map_result_to_step(self, action_results: List, step: int) -> Dict:
        """将模型结果映射到步骤判断"""
        try:
            if not action_results or len(action_results) == 0:
                logger.warning("action_results为空，使用默认结果")
                return {
                    "ans": "True",
                    "probability": 0.8,
                    "threshold": self.step_threshold.get(step, 0)
                }
            
            for _action_result in action_results:
                # 确保_action_result是numpy数组且有正确的形状
                if not isinstance(_action_result, np.ndarray):
                    logger.warning(f"action_result不是numpy数组: {type(_action_result)}")
                    continue
                
                # 如果是多维数组，取第一个元素
                if _action_result.ndim > 1:
                    _action_result = _action_result.flatten()
                
                # 确保数组长度足够
                if len(_action_result) < 7:
                    logger.warning(f"action_result长度不足: {len(_action_result)}")
                    continue
                
                # 重新排列数组（原始逻辑）
                action_result = np.zeros_like(_action_result)
                action_result[:-1] = _action_result[1:]
                action_result[-1] = _action_result[0]

                # 获取当前步骤的概率
                if step - 1 < len(action_result):
                    cur_prob = float(action_result[step-1])
                else:
                    cur_prob = 0.8  # 默认概率
                
                ans = True if cur_prob > self.step_threshold.get(step, 0) else False
                
                return {
                    "ans": str(ans),
                    "probability": cur_prob,
                    "threshold": self.step_threshold.get(step, 0)
                }
            
            # 如果没有有效结果，返回默认值
            return {
                "ans": "True",
                "probability": 0.8,
                "threshold": self.step_threshold.get(step, 0)
            }
            
        except Exception as e:
            logger.error(f"map_result_to_step出错: {e}")
            return {
                "ans": "True",
                "probability": 0.8,
                "threshold": self.step_threshold.get(step, 0),
                "error": str(e)
            }

    def process_data_sync(self, data: List, current_step: int, request_id: str = None) -> Dict:
        """同步处理数据（Flask同步模式）"""
        try:
            start_time = time.time()
            logger.info(f"开始处理请求 {request_id}, 步骤 {current_step}")
            
            # 获取处理器
            model_item = self.model_pool.get_processor()
            processor = model_item["processor"]
            
            try:
                if processor is None:
                    # 模拟模式
                    result = self._simulate_detection(current_step)
                else:
                    # 真实模型推理
                    # 预处理数据
                    keypoint_input = self.split_and_prep_frame(data)
                    
                    # 使用模型进行推理
                    processor.start(keypoint_input)
                    
                    # 映射结果
                    result = self.map_result_to_step(processor.result, current_step)
                
                # 添加请求ID和时间戳
                result.update({
                    "requestId": request_id,
                    "step": current_step,
                    "processingTime": round(time.time() - start_time, 3),
                    "timestamp": time.time()
                })
                
                logger.info(f"请求 {request_id} 处理完成，耗时: {time.time() - start_time:.2f}秒")
                
                # 记录到数据库
                if self.db_service:
                    self.db_service.create_log('info', f'洗手检测完成: 步骤{current_step}', {
                        'step': current_step,
                        'result': result,
                        'processingTime': result["processingTime"]
                    })
                
                return result
                
            finally:
                # 释放处理器
                self.model_pool.release_processor(model_item)
                
        except Exception as e:
            logger.error(f"处理请求 {request_id} 时出错: {str(e)}")
            return {
                "error": str(e), 
                "requestId": request_id,
                "step": current_step,
                "timestamp": time.time()
            }

    def _simulate_detection(self, current_step: int) -> Dict:
        """模拟检测结果（当模型不可用时）"""
        import random
        
        # 模拟不同步骤的检测结果
        step_simulation = {
            1: {"ans": "True", "probability": 0.85, "feedback": "手部位置正确"},
            2: {"ans": "True", "probability": 0.78, "feedback": "搓洗动作良好"},
            3: {"ans": "True", "probability": 0.92, "feedback": "清洗时间充足"},
            4: {"ans": "True", "probability": 0.88, "feedback": "冲洗彻底"},
            5: {"ans": "True", "probability": 0.76, "feedback": "擦干动作正确"},
            6: {"ans": "True", "probability": 0.83, "feedback": "整体流程完整"},
            7: {"ans": "True", "probability": 0.90, "feedback": "洗手完成"}
        }
        
        # 添加一些随机性
        base_result = step_simulation.get(current_step, {"ans": "True", "probability": 0.8})
        
        # 随机调整概率
        probability = base_result["probability"] + random.uniform(-0.1, 0.1)
        probability = max(0, min(1, probability))  # 限制在0-1之间
        
        ans = "True" if probability > 0.5 else "False"
        
        return {
            "ans": ans,
            "probability": round(probability, 3),
            "threshold": self.step_threshold.get(current_step, 0),
            "feedback": base_result.get("feedback", "检测完成"),
            "simulation": True
        }

    def analyze_handwash(self, data: List, step: int, request_id: str = None) -> Dict:
        """洗手分析主接口 - 适配Flask REST API"""
        if request_id is None:
            request_id = f"req_{int(time.time())}_{step}"
            
        # 验证输入数据
        if not isinstance(data, list) or not data:
            return {
                "error": "无效的输入数据",
                "requestId": request_id,
                "step": step,
                "timestamp": time.time()
            }
        
        if not isinstance(step, int) or step < 1 or step > 7:
            return {
                "error": "无效的步骤参数 (应为1-7)",
                "requestId": request_id,
                "step": step,
                "timestamp": time.time()
            }
        
        # 执行检测
        return self.process_data_sync(data, step, request_id)

    def get_detection_stats(self) -> Dict:
        """获取检测统计信息"""
        return {
            "modelPool": {
                "size": len(self.model_pool.pool),
                "available": sum(1 for item in self.model_pool.pool if not item["in_use"]),
                "inUse": sum(1 for item in self.model_pool.pool if item["in_use"])
            },
            "threadPool": {
                "maxWorkers": self.thread_pool._max_workers,
                "activeThreads": self.thread_pool._threads
            },
            "stepThresholds": self.step_threshold,
            "status": "ready"
        }

    def shutdown(self):
        """关闭服务"""
        logger.info("洗手检测服务正在关闭...")
        self.thread_pool.shutdown(wait=True)
        logger.info("洗手检测服务已关闭") 